import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import logger from "../utils/logger";

const region = process.env.AWS_REGION || "ap-southeast-1";
const bucketName = process.env.REPORTS_BUCKET_NAME;

// Explicitly not providing credentials to use IAM Instance Profile
const s3Client = new S3Client({ region });

export const uploadToS3 = async (
  buffer: Buffer,
  fileName: string,
  contentType: string = "application/pdf"
): Promise<string> => {
  if (!bucketName) {
    throw new Error("REPORTS_BUCKET_NAME environment variable is not set");
  }

  try {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileName,
      Body: buffer,
      ContentType: contentType,
      ACL: "public-read", // Make the report publicly downloadable
    });

    await s3Client.send(command);

    // Construct the public URL
    const url = `https://${bucketName}.s3.${region}.amazonaws.com/${fileName}`;
    logger.info({ fileName, bucketName, url }, "File uploaded to S3 successfully");
    
    return url;
  } catch (error: any) {
    logger.error({ error: error.message, fileName }, "S3 Upload failed");
    throw error;
  }
};
