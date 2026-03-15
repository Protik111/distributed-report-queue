import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

const config = new pulumi.Config();
const region = config.get("region") || "us-east-1";
const instanceType = config.get("instanceType") || "t3.micro";

// Get values from Pulumi config
const dockerHubUsername = config.require("dockerHubUsername");
const githubUsername = config.require("githubUsername");
const keyPairName = config.require("keyPairName");

// VPC
const vpc = new aws.ec2.Vpc("job-queue-vpc", {
  cidrBlock: "10.0.0.0/16",
  enableDnsHostnames: true,
  enableDnsSupport: true,
  tags: { Name: "job-queue-vpc" },
});

// Internet Gateway for public access
const igw = new aws.ec2.InternetGateway("job-queue-igw", {
  vpcId: vpc.id,
  tags: { Name: "job-queue-igw" },
});

// Public Subnet
const publicSubnet = new aws.ec2.Subnet("job-queue-public-subnet", {
  vpcId: vpc.id,
  cidrBlock: "10.0.1.0/24",
  availabilityZone: `${region}a`,
  mapPublicIpOnLaunch: true,
  tags: { Name: "job-queue-public-subnet" },
});

// Route Table
const routeTable = new aws.ec2.RouteTable("job-queue-rt", {
  vpcId: vpc.id,
  routes: [{
    cidrBlock: "0.0.0.0/0",
    gatewayId: igw.id,
  }],
  tags: { Name: "job-queue-rt" },
});

// Route Table Association
const rtAssociation = new aws.ec2.RouteTableAssociation("job-queue-rta", {
  subnetId: publicSubnet.id,
  routeTableId: routeTable.id,
});

// Security Group
const sgWorkers = new aws.ec2.SecurityGroup("worker-sg", {
  name: "worker-security-group",
  vpcId: vpc.id,
  description: "Security group for distributed job queue workers",
  ingress: [
    {
      description: "SSH",
      protocol: "tcp",
      fromPort: 22,
      toPort: 22,
      cidrBlocks: ["0.0.0.0/0"],
    },
    {
      description: "Producer API",
      protocol: "tcp",
      fromPort: 5001,
      toPort: 5001,
      cidrBlocks: ["0.0.0.0/0"],
    },
    {
      description: "Worker API",
      protocol: "tcp",
      fromPort: 5002,
      toPort: 5002,
      cidrBlocks: ["0.0.0.0/0"],
    },
    {
      description: "Dashboard API",
      protocol: "tcp",
      fromPort: 5003,
      toPort: 5003,
      cidrBlocks: ["0.0.0.0/0"],
    },
    {
      description: "Dashboard UI",
      protocol: "tcp",
      fromPort: 5004,
      toPort: 5004,
      cidrBlocks: ["0.0.0.0/0"],
    },
  ],
  egress: [{
    description: "All outbound",
    protocol: "-1",
    fromPort: 0,
    toPort: 0,
    cidrBlocks: ["0.0.0.0/0"],
  }],
  tags: { Name: "worker-sg" },
});

// User Data script - installs Docker, Compose, and clones the repo
const userDataScript = pulumi.interpolate`#!/bin/bash
set -e
exec > /var/log/user-data.log 2>&1

yum update -y
yum install -y docker git

# Start Docker
systemctl start docker
systemctl enable docker
usermod -a -G docker ec2-user

# Install Docker Compose v2
mkdir -p /usr/local/lib/docker/cli-plugins
curl -SL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64" -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
ln -sf /usr/local/lib/docker/cli-plugins/docker-compose /usr/local/bin/docker-compose

# Clone the repository
git clone https://github.com/${githubUsername}/distributed-report-queue.git /home/ec2-user/distributed-report-queue
chown -R ec2-user:ec2-user /home/ec2-user/distributed-report-queue

echo "User data script complete. Deploy job will connect via SSH to finish setup."
`;

const encodedUserData = userDataScript.apply((s: string) => Buffer.from(s).toString("base64"));

// EC2 Instance (replaces LaunchTemplate)
const ec2Instance = new aws.ec2.Instance("worker-instance", {
  ami: "ami-0c7217cdde3d9b9cf", // Amazon Linux 2023 (us-east-1)
  instanceType: instanceType,
  subnetId: publicSubnet.id,
  vpcSecurityGroupIds: [sgWorkers.id],
  keyName: keyPairName,
  userData: encodedUserData,
  associatePublicIpAddress: true,
  rootBlockDevice: {
    volumeSize: 20,
    volumeType: "gp3",
    deleteOnTermination: true,
  },
  tags: { Name: "worker-instance" },
});

// Outputs
export const publicIp = ec2Instance.publicIp;
export const publicDns = ec2Instance.publicDns;
export const ec2InstanceId = ec2Instance.id;
export const reportsBucket = "distributed-job-reports";
export const dockerHubUsernameOut = dockerHubUsername;