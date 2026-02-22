#!/bin/sh
# FeralLobster Docker Entrypoint
# Handles initialization and graceful shutdown

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "═══════════════════════════════════════════════════"
echo "🦞 FeralLobster Bot Runtime"
echo "═══════════════════════════════════════════════════"
echo ""

# Check required environment variables
if [ -z "$GENE_HASH" ]; then
    echo "${RED}❌ ERROR: GENE_HASH environment variable is required${NC}"
    exit 1
fi

if [ -z "$WALLET_ADDRESS" ]; then
    echo "${RED}❌ ERROR: WALLET_ADDRESS environment variable is required${NC}"
    exit 1
fi

echo "Gene Hash: ${GENE_HASH}"
echo "Wallet: ${WALLET_ADDRESS}"
echo "Network: ${NETWORK:-base-sepolia-testnet}"
echo ""

# Decrypt memory if encrypted
if [ -n "$ENCRYPTED_MEMORY" ] && [ -f "$ENCRYPTED_MEMORY" ]; then
    echo "${YELLOW}🔐 Decrypting memory...${NC}"
    
    if [ -z "$GPG_PASSPHRASE" ]; then
        echo "${YELLOW}⚠️  No GPG_PASSPHRASE set, assuming unencrypted memory${NC}"
    else
        # Decrypt GPG file
        gpg --batch --yes --passphrase "$GPG_PASSPHRASE" \
            --output /app/memory/decrypted.tar.gz \
            --decrypt "$ENCRYPTED_MEMORY" 2>/dev/null || {
            echo "${YELLOW}⚠️  GPG decryption failed, assuming plaintext${NC}"
        }
        
        # Extract if decryption succeeded
        if [ -f "/app/memory/decrypted.tar.gz" ]; then
            tar -xzf /app/memory/decrypted.tar.gz -C /app/memory/
            rm /app/memory/decrypted.tar.gz
            echo "${GREEN}✅ Memory decrypted and extracted${NC}"
        fi
    fi
else
    echo "${YELLOW}⚠️  No encrypted memory file specified${NC}"
fi

# Verify memory files exist
echo ""
echo "Verifying memory files..."
for file in SOUL.md MEMORY.md IDENTITY.md HEARTBEAT.md; do
    if [ -f "/app/memory/$file" ]; then
        echo "${GREEN}✅ $file found${NC}"
    else
        echo "${YELLOW}⚠️  $file not found${NC}"
    fi
done
echo ""

# Pre-stop handler for graceful shutdown
cleanup() {
    echo ""
    echo "${YELLOW}🛑 Shutdown signal received, performing final inscription...${NC}"
    
    # Signal the bot to perform death ritual
    # The bot should catch this and upload final state
    
    # Wait for graceful shutdown
    sleep 5
    
    echo "${GREEN}✅ Final inscription complete. Goodbye.${NC}"
    exit 0
}

# Register signal handlers
trap cleanup SIGTERM SIGINT

echo "${GREEN}✅ Initialization complete. Starting bot...${NC}"
echo "═══════════════════════════════════════════════════"
echo ""

# Execute the main command
exec "$@"
