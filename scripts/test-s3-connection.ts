
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

// Load .env from project root
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

import { createS3Client, getBucketConfig } from "../lib/aws-config"
import { ListObjectsV2Command } from "@aws-sdk/client-s3"

async function testS3() {
  try {
    const config = getBucketConfig()
    const { bucketName } = config
    const s3Client = createS3Client()
    
    console.log(`Checking connection to bucket: ${bucketName}...`)
    
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      MaxKeys: 1
    })
    
    const response = await s3Client.send(command)
    console.log("✅ S3 Connection Successful!")
    console.log("Found objects:", response.Contents?.length || 0)
    
  } catch (error: any) {
    console.error("❌ S3 Connection Failed:", error.message)
    console.error("Details:", error)
  }
}

testS3()
