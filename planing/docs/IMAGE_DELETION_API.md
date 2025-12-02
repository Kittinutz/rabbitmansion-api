// moved from docs/IMAGE_DELETION_API.md

# Room Type Image Deletion System

This document outlines the comprehensive image deletion system for room types in the hotel management API.

## Overview

The system provides three main approaches to delete room images:

1. **Individual Image Deletion** - Delete a single image by its ID
2. **Bulk Image Deletion** - Delete multiple specific images
3. **Complete Image Cleanup** - Delete all images for a room type

## API Endpoints

### 1. Delete Single Room Image

**DELETE** `/room-types/{roomTypeId}/images/{imageId}`

Deletes a single room image by its ID with validation that the image belongs to the specified room type.

```http
DELETE /room-types/f47ac10b-58cc-4372-a567-0e02b2c3d479/images/a1b2c3d4-e5f6-4789-a1b2-c3d4e5f67890
```

**Response:** `204 No Content`

**Error Cases:**

- `404 Not Found` - Image not found
- `400 Bad Request` - Image doesn't belong to specified room type

---

### 2. Delete Multiple Room Images

**DELETE** `/room-types/{roomTypeId}/images`

Deletes multiple images with flexible options:

#### Option A: Delete Specific Images

```json
{
  "imageIds": [
    "a1b2c3d4-e5f6-4789-a1b2-c3d4e5f67890",
    "b2c3d4e5-f6a7-5890-b2c3-d4e5f6a78901"
  ]
}
```

#### Option B: Delete All Images

```json
{}
```

_Or send no body to delete all images for the room type_

**Response:**

```json
{
  "deletedCount": 3,
  "message": "Successfully deleted 3 images"
}
```

---

### 3. Get Room Image Details

**GET** `/room-types/{roomTypeId}/images/{imageId}`

Retrieves detailed information about a specific room image.

**Response:**

```json
{
  "id": "a1b2c3d4-e5f6-4789-a1b2-c3d4e5f67890",
  "roomTypeId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "url": "http://localhost:9000/hotel-assets/room-images/deluxe-1.jpg",
  "alt": "DELUXE_DOUBLE_1",
  "caption": {
    "en": "Spacious bedroom with city view",
    "th": "ห้องนอนกว้างขวางพร้อมวิวเมือง"
  },
  "isPrimary": true,
  "sortOrder": 0,
  "createdAt": "2025-11-25T10:30:00Z",
  "roomType": {
    "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "code": "DELUXE_DOUBLE",
    "name": {
      "en": "Deluxe Double Room",
      "th": "ห้องดีลักซ์ดับเบิล"
    }
  }
}
```

## Usage Examples

### Frontend Integration Examples

#### Delete Single Image with Confirmation

```typescript
async function deleteRoomImage(roomTypeId: string, imageId: string) {
  try {
    const response = await fetch(
      `/api/room-types/${roomTypeId}/images/${imageId}`,
      { method: 'DELETE' },
    );

    if (response.ok) {
      console.log('Image deleted successfully');
      // Refresh image gallery
    }
  } catch (error) {
    console.error('Failed to delete image:', error);
  }
}
```

#### Bulk Delete Selected Images

```typescript
async function deleteSelectedImages(roomTypeId: string, imageIds: string[]) {
  try {
    const response = await fetch(`/api/room-types/${roomTypeId}/images`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageIds }),
    });

    const result = await response.json();
    console.log(`Deleted ${result.deletedCount} images`);
  } catch (error) {
    console.error('Failed to delete images:', error);
  }
}
```

#### Clear All Images

```typescript
async function clearAllRoomImages(roomTypeId: string) {
  try {
    const response = await fetch(`/api/room-types/${roomTypeId}/images`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}), // Empty object or no body
    });

    const result = await response.json();
    console.log(`Cleared all ${result.deletedCount} images`);
  } catch (error) {
    console.error('Failed to clear images:', error);
  }
}
```

## Security & Validation

### Access Control

- All endpoints require proper authentication
- Room type ownership validation
- Image ownership validation (images must belong to specified room type)

### Input Validation

- UUID format validation for IDs
- Array validation for bulk operations
- Room type existence validation

### Error Handling

- Comprehensive error messages
- Proper HTTP status codes
- Graceful handling of non-existent resources

## Database Operations

### Cascade Behavior

- When a room type is deleted, all associated images are automatically deleted (ON DELETE CASCADE)
- Individual image deletion only affects the specific image record

### Transaction Safety

- Bulk operations are performed in database transactions
- Partial failures are handled gracefully
- Consistent state maintained during operations

## Best Practices

### For Frontend Developers

1. **Always confirm deletions** - Show confirmation dialogs for destructive actions
2. **Batch operations** - Use bulk delete for multiple images rather than individual calls
3. **Error handling** - Implement proper error handling for network failures
4. **UI feedback** - Show loading states and success/error messages
5. **Optimistic updates** - Remove images from UI immediately, rollback on error

### For Backend Integration

1. **Use transactions** for bulk operations
2. **Validate ownership** before deletion
3. **Log deletions** for audit purposes
4. **Consider soft deletes** for important data
5. **Cleanup orphaned files** in storage systems

## Performance Considerations

- Bulk operations are more efficient than multiple individual calls
- Database queries are optimized with proper indexing
- Consider implementing soft deletes for recovery scenarios
- Monitor storage cleanup for orphaned files

## Future Enhancements

1. **Soft Delete Support** - Mark images as deleted instead of permanent removal
2. **File Storage Cleanup** - Automatically remove files from MinIO when images are deleted
3. **Audit Logging** - Track who deleted what and when
4. **Undo Functionality** - Allow recovery of recently deleted images
5. **Batch File Operations** - Combine database and storage operations
