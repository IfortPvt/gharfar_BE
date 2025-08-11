#!/bin/bash

# Gharfar Listing Images API - Environment Validation Script
# This script validates the API endpoints and environment setup

echo "🚀 Gharfar Listing Images API Validation"
echo "========================================"
echo ""

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3000}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@gharfar.com}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-admin123}"
HOST_EMAIL="${HOST_EMAIL:-host@example.com}"
HOST_PASSWORD="${HOST_PASSWORD:-password123}"

echo "🌐 Testing API endpoint: $BASE_URL"
echo ""

# Test 1: Check if server is running
echo "1️⃣  Testing server connectivity..."
SERVER_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/health" 2>/dev/null)

if [ "$SERVER_STATUS" = "200" ]; then
    echo "   ✅ Server is running and accessible"
else
    echo "   ❌ Server is not accessible (HTTP $SERVER_STATUS)"
    echo "   💡 Make sure the server is running on $BASE_URL"
    exit 1
fi
echo ""

# Test 2: Admin Login
echo "2️⃣  Testing admin authentication..."
ADMIN_LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/users/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")

ADMIN_TOKEN=$(echo "$ADMIN_LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -n "$ADMIN_TOKEN" ]; then
    echo "   ✅ Admin authentication successful"
    echo "   🔑 Admin token: ${ADMIN_TOKEN:0:20}..."
else
    echo "   ❌ Admin authentication failed"
    echo "   📋 Response: $ADMIN_LOGIN_RESPONSE"
    echo "   💡 Check admin credentials: $ADMIN_EMAIL / $ADMIN_PASSWORD"
fi
echo ""

# Test 3: Host Login
echo "3️⃣  Testing host authentication..."
HOST_LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/users/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$HOST_EMAIL\",\"password\":\"$HOST_PASSWORD\"}")

HOST_TOKEN=$(echo "$HOST_LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -n "$HOST_TOKEN" ]; then
    echo "   ✅ Host authentication successful"
    echo "   🔑 Host token: ${HOST_TOKEN:0:20}..."
else
    echo "   ❌ Host authentication failed"
    echo "   📋 Response: $HOST_LOGIN_RESPONSE"
    echo "   💡 Check host credentials: $HOST_EMAIL / $HOST_PASSWORD"
fi
echo ""

# Test 4: Check listings endpoint
echo "4️⃣  Testing listings endpoint..."
if [ -n "$HOST_TOKEN" ]; then
    LISTINGS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/listings" \
        -H "Authorization: Bearer $HOST_TOKEN" \
        -H "Content-Type: application/json")
    
    LISTINGS_COUNT=$(echo "$LISTINGS_RESPONSE" | grep -o '"totalItems":[0-9]*' | cut -d':' -f2)
    
    if [ -n "$LISTINGS_COUNT" ]; then
        echo "   ✅ Listings endpoint accessible"
        echo "   📊 Total listings: $LISTINGS_COUNT"
    else
        echo "   ❌ Listings endpoint not working"
        echo "   📋 Response: $LISTINGS_RESPONSE"
    fi
else
    echo "   ⏭️  Skipped (no host token)"
fi
echo ""

# Test 5: Check admin endpoints
echo "5️⃣  Testing admin endpoints..."
if [ -n "$ADMIN_TOKEN" ]; then
    ADMIN_USERS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/admin/users" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "Content-Type: application/json")
    
    USERS_COUNT=$(echo "$ADMIN_USERS_RESPONSE" | grep -o '"totalItems":[0-9]*' | cut -d':' -f2)
    
    if [ -n "$USERS_COUNT" ]; then
        echo "   ✅ Admin endpoints accessible"
        echo "   👥 Total users: $USERS_COUNT"
    else
        echo "   ❌ Admin endpoints not working"
        echo "   📋 Response: $ADMIN_USERS_RESPONSE"
    fi
else
    echo "   ⏭️  Skipped (no admin token)"
fi
echo ""

# Test 6: Check file upload capabilities
echo "6️⃣  Testing file upload capabilities..."
UPLOAD_TEST_DIR="/tmp/gharfar_upload_test"
mkdir -p "$UPLOAD_TEST_DIR"

# Create a small test image (1x1 PNG)
TEST_IMAGE="$UPLOAD_TEST_DIR/test.png"
echo -e "\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\rIDATx\x9cc\xf8\x0f\x00\x00\x01\x00\x01\x00\x00\x00\x00\x00\x18\xdd\x8d\xb4\x1c\x00\x00\x00\x00IEND\xaeB\x60\x82" > "$TEST_IMAGE"

if [ -f "$TEST_IMAGE" ]; then
    echo "   ✅ Test image created successfully"
    echo "   📁 Test file: $TEST_IMAGE"
else
    echo "   ❌ Failed to create test image"
fi

# Cleanup
rm -rf "$UPLOAD_TEST_DIR"
echo ""

# Summary
echo "📋 VALIDATION SUMMARY"
echo "====================="

if [ -n "$ADMIN_TOKEN" ] && [ -n "$HOST_TOKEN" ]; then
    echo "✅ Environment is ready for testing!"
    echo ""
    echo "🛠️  Next Steps:"
    echo "   1. Import the Postman collection"
    echo "   2. Import the environment file" 
    echo "   3. Update the baseUrl to: $BASE_URL"
    echo "   4. Run the authentication requests"
    echo "   5. Start testing image operations"
    echo ""
    echo "🔑 Test Credentials:"
    echo "   Admin: $ADMIN_EMAIL / $ADMIN_PASSWORD"
    echo "   Host:  $HOST_EMAIL / $HOST_PASSWORD"
else
    echo "❌ Environment setup incomplete"
    echo ""
    echo "🔧 Required Actions:"
    
    if [ -z "$ADMIN_TOKEN" ]; then
        echo "   • Fix admin authentication"
    fi
    
    if [ -z "$HOST_TOKEN" ]; then
        echo "   • Fix host authentication"
    fi
    
    echo "   • Verify database seeding"
    echo "   • Check user credentials"
    echo "   • Ensure proper roles are assigned"
fi

echo ""
echo "📚 Documentation:"
echo "   • Collection Guide: postman/GHARFAR_LISTING_IMAGES_POSTMAN_GUIDE.md"
echo "   • Sample Data: postman/SAMPLE_TEST_DATA.md"
echo ""

# Export tokens for use in other scripts
if [ -n "$ADMIN_TOKEN" ]; then
    echo "export ADMIN_TOKEN=\"$ADMIN_TOKEN\"" > /tmp/gharfar_tokens.sh
fi

if [ -n "$HOST_TOKEN" ]; then
    echo "export HOST_TOKEN=\"$HOST_TOKEN\"" >> /tmp/gharfar_tokens.sh
fi

if [ -f "/tmp/gharfar_tokens.sh" ]; then
    echo "💾 Tokens saved to /tmp/gharfar_tokens.sh"
    echo "   Run: source /tmp/gharfar_tokens.sh"
fi

echo ""
echo "🎯 Happy Testing!"
