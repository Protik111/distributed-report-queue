import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as tls from "@pulumi/tls";

const config = new pulumi.Config();
const region = config.get("region") || "ap-southeast-1";
const instanceType = config.get("instanceType") || "t2.micro";

// Get values from Pulumi config
const dockerHubUsername = config.require("dockerHubUsername");
const githubUsername = config.require("githubUsername");

// Explicit AWS Provider to force the region and avoid any implicit confusion
const provider = new aws.Provider("aws-provider", {
    region: region as aws.Region,
});

// Create an SSH Key Pair dynamically
const sshKey = new tls.PrivateKey("worker-ssh-key", {
    algorithm: "RSA",
    rsaBits: 4096,
});

const keyPair = new aws.ec2.KeyPair("worker-key-pair", {
    keyName: "job-queue-auto-key",
    publicKey: sshKey.publicKeyOpenssh,
}, { provider });

// S3 Bucket for reports
const bucket = new aws.s3.BucketV2("reports-bucket", {
    bucket: `distributed-job-reports-${githubUsername}`.toLowerCase(),
    forceDestroy: true, // Allow deletion if not empty during cleanup
}, { provider });

// Enable Public Access Block (disable it to allow public read)
const bucketPublicAccessBlock = new aws.s3.BucketPublicAccessBlock("reports-bucket-pab", {
    bucket: bucket.id,
    blockPublicAcls: false,
    blockPublicPolicy: false,
    ignorePublicAcls: false,
    restrictPublicBuckets: false,
}, { provider });

// IAM Role for EC2
const ec2Role = new aws.iam.Role("worker-ec2-role", {
    assumeRolePolicy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [{
            Action: "sts:AssumeRole",
            Effect: "Allow",
            Principal: { Service: "ec2.amazonaws.com" },
        }],
    }),
}, { provider });

// IAM Policy for S3 access
const s3Policy = new aws.iam.RolePolicy("worker-s3-policy", {
    role: ec2Role.id,
    policy: pulumi.all([bucket.arn]).apply(([arn]) => JSON.stringify({
        Version: "2012-10-17",
        Statement: [
            {
                Action: ["s3:PutObject", "s3:PutObjectAcl", "s3:GetObject"],
                Effect: "Allow",
                Resource: [`${arn}/*`],
            },
            {
                Action: ["s3:ListBucket"],
                Effect: "Allow",
                Resource: [arn],
            },
        ],
    })),
}, { provider });

// Instance Profile
const instanceProfile = new aws.iam.InstanceProfile("worker-instance-profile", {
    role: ec2Role.name,
}, { provider });

// VPC
const vpc = new aws.ec2.Vpc("job-queue-vpc", {
  cidrBlock: "10.0.0.0/16",
  enableDnsHostnames: true,
  enableDnsSupport: true,
  tags: { Name: "job-queue-vpc" },
}, { provider });

// Internet Gateway for public access
const igw = new aws.ec2.InternetGateway("job-queue-igw", {
  vpcId: vpc.id,
  tags: { Name: "job-queue-igw" },
}, { provider });

// Public Subnet
const publicSubnet = new aws.ec2.Subnet("job-queue-public-subnet", {
  vpcId: vpc.id,
  cidrBlock: "10.0.1.0/24",
  availabilityZone: `${region}a`,
  mapPublicIpOnLaunch: true,
  tags: { Name: "job-queue-public-subnet" },
}, { provider });

// Route Table
const routeTable = new aws.ec2.RouteTable("job-queue-rt", {
  vpcId: vpc.id,
  routes: [{
    cidrBlock: "0.0.0.0/0",
    gatewayId: igw.id,
  }],
  tags: { Name: "job-queue-rt" },
}, { provider });

// Route Table Association
const rtAssociation = new aws.ec2.RouteTableAssociation("job-queue-rta", {
  subnetId: publicSubnet.id,
  routeTableId: routeTable.id,
}, { provider });

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
}, { provider });

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

// Dynamic AMI Lookup for Amazon Linux 2023
const ami = aws.ec2.getAmi({
    mostRecent: true,
    owners: ["amazon"],
    filters: [
        { name: "name", values: ["al2023-ami-2023*-x86_64"] },
        { name: "virtualization-type", values: ["hvm"] },
    ],
}, { provider });

// EC2 Instance
const ec2Instance = new aws.ec2.Instance("worker-instance", {
  ami: ami.then(a => a.id),
  instanceType: instanceType,
  subnetId: publicSubnet.id,
  vpcSecurityGroupIds: [sgWorkers.id],
  keyName: keyPair.keyName,
  userData: userDataScript,
  iamInstanceProfile: instanceProfile.name,
  associatePublicIpAddress: true,
  rootBlockDevice: {
    volumeSize: 20,
    volumeType: "gp2",
    deleteOnTermination: true,
  },
  tags: { Name: "worker-instance" },
}, { provider });

// Outputs
export const publicIp = ec2Instance.publicIp;
export const publicDns = ec2Instance.publicDns;
export const ec2InstanceId = ec2Instance.id;
export const reportsBucket = bucket.id;
export const dockerHubUsernameOut = dockerHubUsername;
export const privateKey = sshKey.privateKeyPem;