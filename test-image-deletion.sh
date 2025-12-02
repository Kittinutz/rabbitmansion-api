#!/bin/bash

# Room Type Image Deletion API Test Script
# This script demonstrates the image deletion functionality

BASE_URL="http://localhost:3001"
ROOM_TYPE_ID="your-room-type-id-here"
IMAGE_ID="your-image-id-here"

echo "🧪 Room Type Image Deletion API Test Script"
echo "=============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Available Endpoints:${NC}"
echo ""

# Test 1: Get room image details
echo -e "${YELLOW}1. Get Room Image Details${NC}"
echo "GET ${BASE_URL}/room-types/{roomTypeId}/images/{imageId}"
echo "Example:"
echo "curl -X GET \"${BASE_URL}/room-types/${ROOM_TYPE_ID}/images/${IMAGE_ID}\""
echo ""

# Test 2: Delete single image
echo -e "${YELLOW}2. Delete Single Room Image${NC}"
echo "DELETE ${BASE_URL}/room-types/{roomTypeId}/images/{imageId}"
echo "Example:"
echo "curl -X DELETE \"${BASE_URL}/room-types/${ROOM_TYPE_ID}/images/${IMAGE_ID}\""
echo ""

# Test 3: Delete specific images
echo -e "${YELLOW}3. Delete Specific Room Images${NC}"
echo "DELETE ${BASE_URL}/room-types/{roomTypeId}/images"
echo "Example:"
echo "curl -X DELETE \"${BASE_URL}/room-types/${ROOM_TYPE_ID}/images\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"imageIds\": [\"image-id-1\", \"image-id-2\"]}'"
echo ""

# Test 4: Delete all images
echo -e "${YELLOW}4. Delete All Room Type Images${NC}"
echo "DELETE ${BASE_URL}/room-types/{roomTypeId}/images"
echo "Example:"
echo "curl -X DELETE \"${BASE_URL}/room-types/${ROOM_TYPE_ID}/images\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{}'"
echo ""

# Test 5: Create room type with images (for testing)
echo -e "${YELLOW}5. Create Room Type with Images (for testing)${NC}"
echo "POST ${BASE_URL}/room-types"
echo "Example:"
echo "curl -X POST \"${BASE_URL}/room-types\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{"
echo "    \"code\": \"TEST_ROOM_DELETE\","
echo "    \"name\": {"
echo "      \"en\": \"Test Room for Deletion\","
echo "      \"th\": \"ห้องทดสอบสำหรับลบ\""
echo "    },"
echo "    \"basePrice\": 1000,"
echo "    \"capacity\": 2,"
echo "    \"bedType\": \"Double\","
echo "    \"roomImages\": ["
echo "      \"http://example.com/test1.jpg\","
echo "      \"http://example.com/test2.jpg\","
echo "      \"http://example.com/test3.jpg\""
echo "    ]"
echo "  }'"
echo ""

echo -e "${GREEN}✨ Usage Instructions:${NC}"
echo ""
echo "1. First, create a room type with some test images using example 5"
echo "2. Note the room type ID from the response"
echo "3. Get the list of room images to see their IDs"
echo "4. Test the deletion endpoints with the actual IDs"
echo ""

echo -e "${BLUE}📝 Expected Responses:${NC}"
echo ""
echo -e "${GREEN}Success (Single Delete):${NC} 204 No Content"
echo -e "${GREEN}Success (Bulk Delete):${NC}"
echo "{"
echo "  \"deletedCount\": 2,"
echo "  \"message\": \"Successfully deleted 2 images\""
echo "}"
echo ""

echo -e "${RED}Error Responses:${NC}"
echo "404 - Image not found"
echo "400 - Image doesn't belong to room type"
echo "404 - Room type not found"
echo ""

# Interactive test function
echo -e "${BLUE}🚀 Interactive Test Function:${NC}"
echo ""
echo "To run an interactive test, use this function in your terminal:"
echo ""
echo "test_image_deletion() {"
echo "  local room_type_id=\$1"
echo "  local image_id=\$2"
echo "  "
echo "  if [ -z \"\$room_type_id\" ] || [ -z \"\$image_id\" ]; then"
echo "    echo \"Usage: test_image_deletion <room_type_id> <image_id>\""
echo "    return 1"
echo "  fi"
echo "  "
echo "  echo \"Getting image details...\""
echo "  curl -X GET \"${BASE_URL}/room-types/\$room_type_id/images/\$image_id\" | jq ."
echo "  "
echo "  echo \"Deleting image...\""
echo "  curl -X DELETE \"${BASE_URL}/room-types/\$room_type_id/images/\$image_id\""
echo "  "
echo "  echo \"Verifying deletion...\""
echo "  curl -X GET \"${BASE_URL}/room-types/\$room_type_id/images/\$image_id\""
echo "}"
echo ""

echo -e "${YELLOW}💡 Pro Tips:${NC}"
echo ""
echo "• Use jq for JSON formatting: curl ... | jq ."
echo "• Check room types: curl ${BASE_URL}/room-types | jq ."
echo "• Check Swagger docs: ${BASE_URL}/api"
echo "• Test with Postman using the provided examples"
echo ""

echo -e "${GREEN}✅ Image Deletion System Ready!${NC}"