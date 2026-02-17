import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
    region: process.env.AWS_REGION || "us-east-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
});

export async function deleteS3Object(fileUrl: string) {
    if (!fileUrl) return;

    try {
        const url = new URL(fileUrl);
        // Extract key from URL. 
        // Example: https://bucket.s3.region.amazonaws.com/uploads/key.jpg
        // Key: uploads/key.jpg
        const key = url.pathname.substring(1); // Remove leading slash

        await s3Client.send(new DeleteObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: key,
        }));
        console.log(`Deleted S3 object: ${key}`);
    } catch (error) {
        console.error("Failed to delete S3 object:", error);
        // We generally don't throw here to avoid blocking the DB deletion, 
        // effectively treating S3 delete as "best effort".
    }
}
