import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  BadRequestException,
  NotFoundException,
  HttpStatus,
  HttpCode,
  Query,
  Req,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiParam,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { MinioService } from '../minio/minio.service';

@ApiTags('files')
@Controller('files')
export class FileController {
  constructor(private readonly minioService: MinioService) {}

  @Post('upload')
  @ApiOperation({
    summary: 'Upload single file',
    description:
      'Upload a single file to MinIO storage (images, documents, etc.)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'File upload',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File to upload',
        },
        folder: {
          type: 'string',
          description: 'Folder name (optional)',
          default: 'uploads',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'File uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'File uploaded successfully' },
        data: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              example:
                'http://localhost:9000/hotel-assets/uploads/1234567890-image.jpg',
            },
            key: { type: 'string', example: 'uploads/1234567890-image.jpg' },
            bucket: { type: 'string', example: 'hotel-assets' },
            originalName: { type: 'string', example: 'image.jpg' },
            mimeType: { type: 'string', example: 'image/jpeg' },
            size: { type: 'number', example: 123456 },
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'No file provided or invalid file type',
  })
  async uploadFile(
    @Req() request: FastifyRequest,
    @Query('folder') folder: string = 'uploads',
  ) {
    try {
      // Check if the request is multipart
      if (!request.isMultipart?.()) {
        throw new BadRequestException('Request must be multipart/form-data');
      }

      const data = await request.file?.();

      if (!data) {
        throw new BadRequestException('No file provided');
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      const chunks: Buffer[] = [];
      let totalSize = 0;

      for await (const chunk of data.file) {
        const buffer = chunk as Buffer;
        chunks.push(buffer);
        totalSize += buffer.length;
        if (totalSize > maxSize) {
          throw new BadRequestException('File size exceeds 10MB limit');
        }
      }

      const buffer = Buffer.concat(chunks);

      // Validate file type for common formats
      const allowedMimes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/svg+xml',
        'application/pdf',
        'text/plain',
        'application/json',
      ];

      if (!allowedMimes.includes(data.mimetype)) {
        throw new BadRequestException(
          `Unsupported file type: ${data.mimetype}. Allowed types: ${allowedMimes.join(', ')}`,
        );
      }

      // Create a file object compatible with Express.Multer.File
      const file = {
        fieldname: 'file',
        originalname: data.filename || 'unnamed-file',
        encoding: data.encoding || '7bit',
        mimetype: data.mimetype,
        size: buffer.length,
        buffer: buffer,
        destination: '',
        filename: '',
        path: '',
        stream: undefined as any,
      } as Express.Multer.File;

      const uploadedFile = await this.minioService.uploadFile(file, folder);

      return {
        success: true,
        message: 'File uploaded successfully',
        data: uploadedFile,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Upload failed: ${(error as Error).message || 'Unknown error'}`,
      );
    }
  }

  @Get(':folder/:filename')
  @ApiOperation({
    summary: 'Get file URL',
    description: 'Get the URL for a specific file',
  })
  @ApiParam({
    name: 'folder',
    description: 'Folder name',
    example: 'uploads',
  })
  @ApiParam({
    name: 'filename',
    description: 'File name',
    example: '1234567890-image.jpg',
  })
  @ApiResponse({
    status: 200,
    description: 'File URL retrieved successfully',
  })
  @ApiNotFoundResponse({
    description: 'File not found',
  })
  async getFileUrl(
    @Param('folder') folder: string,
    @Param('filename') filename: string,
  ) {
    const key = `${folder}/${filename}`;

    try {
      const exists = await this.minioService.fileExists(key);

      if (!exists) {
        throw new NotFoundException(`File not found: ${key}`);
      }

      const url = this.minioService.getFileUrl(key);

      return {
        success: true,
        data: {
          url,
          key,
          exists,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to get file URL: ${error.message}`);
    }
  }

  @Get(':folder/:filename/info')
  @ApiOperation({
    summary: 'Get file information',
    description: 'Get metadata information about a file',
  })
  @ApiParam({
    name: 'folder',
    description: 'Folder name',
    example: 'uploads',
  })
  @ApiParam({
    name: 'filename',
    description: 'File name',
    example: '1234567890-image.jpg',
  })
  @ApiResponse({
    status: 200,
    description: 'File information retrieved successfully',
  })
  @ApiNotFoundResponse({
    description: 'File not found',
  })
  async getFileInfo(
    @Param('folder') folder: string,
    @Param('filename') filename: string,
  ) {
    const key = `${folder}/${filename}`;

    try {
      const exists = await this.minioService.fileExists(key);
      if (!exists) {
        throw new NotFoundException(`File not found: ${key}`);
      }

      const fileInfo = await this.minioService.getFileInfo(key);
      const url = this.minioService.getFileUrl(key);

      return {
        success: true,
        data: {
          key,
          url,
          size: fileInfo.size,
          contentType: fileInfo.metaData?.['content-type'] || 'unknown',
          lastModified: fileInfo.lastModified,
          etag: fileInfo.etag,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to get file info: ${error.message}`,
      );
    }
  }

  @Delete(':folder/:filename')
  @ApiOperation({
    summary: 'Delete a file',
    description: 'Delete a file from MinIO storage',
  })
  @ApiParam({
    name: 'folder',
    description: 'Folder name',
    example: 'uploads',
  })
  @ApiParam({
    name: 'filename',
    description: 'File name',
    example: '1234567890-image.jpg',
  })
  @ApiResponse({
    status: 200,
    description: 'File deleted successfully',
  })
  @ApiNotFoundResponse({
    description: 'File not found',
  })
  @HttpCode(HttpStatus.OK)
  async deleteFile(
    @Param('folder') folder: string,
    @Param('filename') filename: string,
  ) {
    const key = `${folder}/${filename}`;

    try {
      const exists = await this.minioService.fileExists(key);
      if (!exists) {
        throw new NotFoundException(`File not found: ${key}`);
      }

      await this.minioService.deleteFile(key);

      return {
        success: true,
        message: 'File deleted successfully',
        data: { key },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Delete failed: ${error.message}`);
    }
  }

  @Get('list/:folder')
  @ApiOperation({
    summary: 'List files in folder',
    description: 'List all files in a specific folder',
  })
  @ApiParam({
    name: 'folder',
    description: 'Folder name',
    example: 'uploads',
  })
  @ApiResponse({
    status: 200,
    description: 'Files listed successfully',
  })
  async listFiles(@Param('folder') folder: string) {
    try {
      const files = await this.minioService.listFiles(folder);

      const filesWithUrls = files.map((key) => ({
        key,
        url: this.minioService.getFileUrl(key),
        folder: key.split('/')[0],
        filename: key.split('/').slice(1).join('/'),
      }));

      return {
        success: true,
        data: {
          folder,
          count: filesWithUrls.length,
          files: filesWithUrls,
        },
      };
    } catch (error) {
      throw new BadRequestException(`List failed: ${error.message}`);
    }
  }

  @Post('presigned-url')
  @ApiOperation({
    summary: 'Get presigned URL',
    description: 'Get a presigned URL for secure file access',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        key: {
          type: 'string',
          description: 'File key (folder/filename)',
          example: 'uploads/image.jpg',
        },
        expiry: {
          type: 'number',
          description: 'URL expiry in seconds (default: 3600)',
          example: 3600,
        },
      },
      required: ['key'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Presigned URL generated successfully',
  })
  @ApiNotFoundResponse({
    description: 'File not found',
  })
  async getPresignedUrl(@Req() request: FastifyRequest) {
    const body = request.body as { key: string; expiry?: number };

    if (!body.key) {
      throw new BadRequestException('File key is required');
    }

    try {
      const exists = await this.minioService.fileExists(body.key);
      if (!exists) {
        throw new NotFoundException(`File not found: ${body.key}`);
      }

      const presignedUrl = await this.minioService.getPresignedUrl(
        body.key,
        body.expiry || 3600,
      );

      return {
        success: true,
        data: {
          key: body.key,
          presignedUrl,
          expiresIn: body.expiry || 3600,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to generate presigned URL: ${error.message}`,
      );
    }
  }
}
