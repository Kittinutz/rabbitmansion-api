import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as Minio from 'minio';
import { ConfigService } from '@nestjs/config';
import { Readable } from 'stream';

export interface UploadedFile {
  url: string;
  key: string;
  bucket: string;
  originalName: string;
  mimeType: string;
  size: number;
}

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private minioClient: Minio.Client;
  private bucketName: string;

  constructor(private configService: ConfigService) {
    this.bucketName = this.configService.get(
      'MINIO_BUCKET_NAME',
      'hotel-assets',
    );

    this.minioClient = new Minio.Client({
      endPoint: this.configService.get('MINIO_ENDPOINT', 'localhost'),
      port: parseInt(this.configService.get('MINIO_PORT', '9000')),
      useSSL: this.configService.get('MINIO_USE_SSL', 'false') === 'true',
      accessKey: this.configService.get('MINIO_ACCESS_KEY', 'minioadmin'),
      secretKey: this.configService.get('MINIO_SECRET_KEY', 'minioadmin123'),
    });
  }

  async onModuleInit() {
    try {
      await this.createBucketIfNotExists();
      this.logger.log('✅ MinIO service initialized successfully');
    } catch (error) {
      this.logger.error('❌ Failed to initialize MinIO service', error);
    }
  }

  private async createBucketIfNotExists() {
    const bucketExists = await this.minioClient.bucketExists(this.bucketName);
    if (!bucketExists) {
      await this.minioClient.makeBucket(this.bucketName, 'us-east-1');
      this.logger.log(`📦 Created bucket: ${this.bucketName}`);

      // Set bucket policy to allow public read access for hotel assets
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${this.bucketName}/*`],
          },
        ],
      };

      await this.minioClient.setBucketPolicy(
        this.bucketName,
        JSON.stringify(policy),
      );
      this.logger.log(
        `🔓 Set public read policy for bucket: ${this.bucketName}`,
      );
    }
  }

  /**
   * Upload a file to MinIO
   */
  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'uploads',
  ): Promise<UploadedFile> {
    const timestamp = Date.now();
    const fileName = `${folder}/${timestamp}-${file.originalname}`;
    const stream = Readable.from(file.buffer);

    try {
      await this.minioClient.putObject(
        this.bucketName,
        fileName,
        stream,
        file.size,
        {
          'Content-Type': file.mimetype,
          'X-Original-Name': file.originalname,
        },
      );

      const url = this.getFileUrl(fileName);

      this.logger.log(`📤 File uploaded: ${fileName}`);

      return {
        url,
        key: fileName,
        bucket: this.bucketName,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      };
    } catch (error) {
      this.logger.error(
        `❌ Failed to upload file: ${file.originalname}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Upload multiple files
   */
  async uploadFiles(
    files: Express.Multer.File[],
    folder: string = 'uploads',
  ): Promise<UploadedFile[]> {
    const uploadPromises = files.map((file) => this.uploadFile(file, folder));
    return Promise.all(uploadPromises);
  }

  /**
   * Get file URL for public access
   */
  getFileUrl(key: string): string {
    const endpoint = this.configService.get<string>(
      'MINIO_ENDPOINT',
      'localhost',
    );
    const port = this.configService.get<string>('MINIO_PORT', '9000');
    const useSSL =
      this.configService.get<string>('MINIO_USE_SSL', 'false') === 'true';
    const protocol = useSSL ? 'https' : 'http';

    return `${protocol}://${endpoint}:${port}/${this.bucketName}/${key}`;
  }

  /**
   * Get presigned URL for temporary access (for private files)
   */
  async getPresignedUrl(
    key: string,
    expirySeconds: number = 3600,
  ): Promise<string> {
    try {
      return await this.minioClient.presignedGetObject(
        this.bucketName,
        key,
        expirySeconds,
      );
    } catch (error) {
      this.logger.error(
        `❌ Failed to generate presigned URL for: ${key}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Delete a file
   */
  async deleteFile(key: string): Promise<void> {
    try {
      await this.minioClient.removeObject(this.bucketName, key);
      this.logger.log(`🗑️ File deleted: ${key}`);
    } catch (error) {
      this.logger.error(`❌ Failed to delete file: ${key}`, error);
      throw error;
    }
  }

  /**
   * Delete multiple files
   */
  async deleteFiles(keys: string[]): Promise<void> {
    try {
      await this.minioClient.removeObjects(this.bucketName, keys);
      this.logger.log(`🗑️ Files deleted: ${keys.length} files`);
    } catch (error) {
      this.logger.error('❌ Failed to delete files', error);
      throw error;
    }
  }

  /**
   * Check if file exists
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      await this.minioClient.statObject(this.bucketName, key);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file metadata
   */
  async getFileInfo(key: string) {
    try {
      return await this.minioClient.statObject(this.bucketName, key);
    } catch (error) {
      this.logger.error(`❌ Failed to get file info: ${key}`, error);
      throw error;
    }
  }

  /**
   * List files in a folder
   */
  async listFiles(prefix: string = ''): Promise<string[]> {
    const files: string[] = [];

    return new Promise((resolve, reject) => {
      const stream = this.minioClient.listObjects(
        this.bucketName,
        prefix,
        true,
      );

      stream.on('data', (obj) => {
        if (obj.name) {
          files.push(obj.name);
        }
      });

      stream.on('end', () => {
        resolve(files);
      });

      stream.on('error', (error) => {
        this.logger.error(
          `❌ Failed to list files with prefix: ${prefix}`,
          error,
        );
        reject(error);
      });
    });
  }
}
