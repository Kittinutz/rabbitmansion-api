import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
  NotFoundException,
  HttpStatus,
  HttpCode,
  Query,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
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
  @UseInterceptors(FileInterceptor('file'))
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
          description: 'Optional folder name (default: uploads)',
          example: 'room-images',
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
            size: { type: 'number', example: 1024000 },
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'No file provided or invalid file' })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folder?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file type (images, documents, videos)
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'video/mp4',
      'video/mpeg',
      'video/quicktime',
    ];

    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Unsupported file type: ${file.mimetype}. Allowed types: ${allowedMimes.join(', ')}`,
      );
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      throw new BadRequestException(
        `File too large. Maximum size: ${maxSize / 1024 / 1024}MB`,
      );
    }

    const uploadedFile = await this.minioService.uploadFile(
      file,
      folder || 'uploads',
    );

    return {
      success: true,
      data: uploadedFile,
    };
  }

  @Post('upload-multiple')
  @UseInterceptors(FilesInterceptor('files', 10))
  @ApiOperation({
    summary: 'Upload multiple files',
    description: 'Upload multiple files to MinIO storage (max 10 files)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Multiple file upload',
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'Files to upload (max 10)',
        },
        folder: {
          type: 'string',
          description: 'Optional folder name (default: uploads)',
          example: 'room-gallery',
        },
      },
      required: ['files'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Files uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              url: { type: 'string' },
              key: { type: 'string' },
              bucket: { type: 'string' },
              originalName: { type: 'string' },
              mimeType: { type: 'string' },
              size: { type: 'number' },
            },
          },
        },
        summary: {
          type: 'object',
          properties: {
            total: { type: 'number', example: 5 },
            successful: { type: 'number', example: 5 },
            failed: { type: 'number', example: 0 },
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'No files provided or invalid files' })
  async uploadMultipleFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @Query('folder') folder?: string,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    if (files.length > 10) {
      throw new BadRequestException('Maximum 10 files allowed per upload');
    }

    const uploadedFiles = await this.minioService.uploadFiles(
      files,
      folder || 'uploads',
    );

    return {
      success: true,
      data: uploadedFiles,
      summary: {
        total: files.length,
        successful: uploadedFiles.length,
        failed: files.length - uploadedFiles.length,
      },
    };
  }

  @Get(':folder/:filename')
  @ApiOperation({
    summary: 'Get file URL',
    description: 'Get the public URL for a file',
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
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              example:
                'http://localhost:9000/hotel-assets/uploads/1234567890-image.jpg',
            },
            key: { type: 'string', example: 'uploads/1234567890-image.jpg' },
            exists: { type: 'boolean', example: true },
          },
        },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'File not found' })
  async getFileUrl(
    @Param('folder') folder: string,
    @Param('filename') filename: string,
  ) {
    const key = `${folder}/${filename}`;
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
  }

  @Get(':folder/:filename/info')
  @ApiOperation({
    summary: 'Get file information',
    description: 'Get detailed information about a file',
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
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            key: { type: 'string' },
            size: { type: 'number' },
            lastModified: { type: 'string' },
            contentType: { type: 'string' },
            etag: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'File not found' })
  async getFileInfo(
    @Param('folder') folder: string,
    @Param('filename') filename: string,
  ) {
    const key = `${folder}/${filename}`;
    const fileInfo = await this.minioService.getFileInfo(key);

    return {
      success: true,
      data: {
        key,
        size: fileInfo.size,
        lastModified: fileInfo.lastModified,
        // contentType: fileInfo.contentType, // Remove this as it doesn't exist on BucketItemStat
        etag: fileInfo.etag,
      },
    };
  }

  @Get('list/:folder')
  @ApiOperation({
    summary: 'List files in folder',
    description: 'Get a list of all files in a specific folder',
  })
  @ApiParam({
    name: 'folder',
    description: 'Folder name',
    example: 'uploads',
  })
  @ApiResponse({
    status: 200,
    description: 'Files listed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            folder: { type: 'string', example: 'uploads' },
            files: {
              type: 'array',
              items: { type: 'string' },
              example: [
                'uploads/1234567890-image.jpg',
                'uploads/1234567891-document.pdf',
              ],
            },
            count: { type: 'number', example: 2 },
          },
        },
      },
    },
  })
  async listFiles(@Param('folder') folder: string) {
    const files = await this.minioService.listFiles(folder);

    return {
      success: true,
      data: {
        folder,
        files,
        count: files.length,
      },
    };
  }

  @Delete(':folder/:filename')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete file',
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
    status: 204,
    description: 'File deleted successfully',
  })
  @ApiNotFoundResponse({ description: 'File not found' })
  async deleteFile(
    @Param('folder') folder: string,
    @Param('filename') filename: string,
  ) {
    const key = `${folder}/${filename}`;
    const exists = await this.minioService.fileExists(key);

    if (!exists) {
      throw new NotFoundException(`File not found: ${key}`);
    }

    await this.minioService.deleteFile(key);
  }

  @Post('presigned-url')
  @ApiOperation({
    summary: 'Get presigned URL',
    description: 'Generate a temporary presigned URL for private file access',
  })
  @ApiBody({
    description: 'Presigned URL request',
    schema: {
      type: 'object',
      properties: {
        key: {
          type: 'string',
          description: 'File key (folder/filename)',
          example: 'uploads/1234567890-image.jpg',
        },
        expirySeconds: {
          type: 'number',
          description: 'URL expiry time in seconds (default: 3600 = 1 hour)',
          example: 3600,
        },
      },
      required: ['key'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Presigned URL generated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              example:
                'http://localhost:9000/hotel-assets/uploads/file.jpg?X-Amz-Algorithm=...',
            },
            key: { type: 'string', example: 'uploads/1234567890-image.jpg' },
            expiresIn: { type: 'number', example: 3600 },
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid key or expiry time' })
  @ApiNotFoundResponse({ description: 'File not found' })
  async getPresignedUrl(
    @Query('key') key: string,
    @Query('expirySeconds') expirySeconds: number = 3600,
  ) {
    if (!key) {
      throw new BadRequestException('File key is required');
    }

    const exists = await this.minioService.fileExists(key);
    if (!exists) {
      throw new NotFoundException(`File not found: ${key}`);
    }

    const url = await this.minioService.getPresignedUrl(key, expirySeconds);

    return {
      success: true,
      data: {
        url,
        key,
        expiresIn: expirySeconds,
      },
    };
  }
}
