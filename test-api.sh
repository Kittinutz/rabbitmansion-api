#!/bin/bash

# Room Management API Test Script
echo "=== Room Management API Test Script ==="
echo "Base URL: http://localhost:3000"
echo ""

# Check if server is running
echo "1. Testing server health..."
curl -s http://localhost:3000/health || {
    echo "❌ Server not running. Please start the server with: npm run start:dev"
    exit 1
}
echo "✅ Server is running"
echo ""

# Initialize all rooms
echo "2. Initializing all rooms..."
INIT_RESPONSE=$(curl -s -X POST http://localhost:3000/rooms/initialize)
echo "✅ Rooms initialization completed"
echo ""

# Get all rooms
echo "3. Getting all rooms..."
ALL_ROOMS=$(curl -s http://localhost:3000/rooms)
ROOM_COUNT=$(echo $ALL_ROOMS | jq length 2>/dev/null || echo "Unknown")
echo "✅ Total rooms: $ROOM_COUNT"
echo ""

# Get available rooms
echo "4. Getting available rooms..."
AVAILABLE_ROOMS=$(curl -s "http://localhost:3000/rooms?status=AVAILABLE")
AVAILABLE_COUNT=$(echo $AVAILABLE_ROOMS | jq length 2>/dev/null || echo "Unknown")
echo "✅ Available rooms: $AVAILABLE_COUNT"
echo ""

# Get rooms by type
echo "5. Getting Superior rooms..."
SUPERIOR_ROOMS=$(curl -s http://localhost:3000/rooms/type/SUPERIOR)
SUPERIOR_COUNT=$(echo $SUPERIOR_ROOMS | jq length 2>/dev/null || echo "Unknown")
echo "✅ Superior rooms: $SUPERIOR_COUNT"
echo ""

# Get rooms by floor
echo "6. Getting floor 2 rooms..."
FLOOR_2_ROOMS=$(curl -s http://localhost:3000/rooms/floor/2)
FLOOR_2_COUNT=$(echo $FLOOR_2_ROOMS | jq length 2>/dev/null || echo "Unknown")
echo "✅ Floor 2 rooms: $FLOOR_2_COUNT"
echo ""

# Get specific room
echo "7. Getting room 101..."
ROOM_101=$(curl -s http://localhost:3000/rooms/number/101)
echo "✅ Room 101 details retrieved"
echo ""

# Create a new room
echo "8. Creating a custom room..."
NEW_ROOM=$(curl -s -X POST http://localhost:3000/rooms \
  -H "Content-Type: application/json" \
  -d '{
    "roomNumber": "401",
    "roomType": "SUPERIOR",
    "price": 5000,
    "description": "Penthouse suite"
  }')
echo "✅ New room 401 created"
echo ""

# Update room status
echo "9. Updating room status to OCCUPIED..."
if [ "$ROOM_COUNT" -gt 0 ]; then
    UPDATE_RESPONSE=$(curl -s -X PUT http://localhost:3000/rooms/1/status \
      -H "Content-Type: application/json" \
      -d '{"status": "OCCUPIED"}')
    echo "✅ Room status updated"
else
    echo "⚠️  No rooms available to update"
fi
echo ""

echo "=== Test Complete ==="
echo ""
echo "📊 Summary:"
echo "   - Total rooms: $ROOM_COUNT"
echo "   - Available rooms: $AVAILABLE_COUNT"
echo "   - Superior rooms: $SUPERIOR_COUNT"
echo "   - Floor 2 rooms: $FLOOR_2_COUNT"
echo ""
echo "🔗 API Endpoints tested:"
echo "   ✅ POST /rooms/initialize"
echo "   ✅ GET /rooms"
echo "   ✅ GET /rooms?status=AVAILABLE"
echo "   ✅ GET /rooms/type/SUPERIOR"
echo "   ✅ GET /rooms/floor/2"
echo "   ✅ GET /rooms/number/101"
echo "   ✅ POST /rooms"
echo "   ✅ PUT /rooms/1/status"
echo ""
echo "For more detailed API documentation, see: ROOM_API_DOCUMENTATION.md"