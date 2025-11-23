# WalrusStamp Move Contract

Bu basit Move contract'ı, Walrus'tan yüklenen dosyaları Sui blockchain'ine "stamp" etmek için kullanılır.

## Contract Yapısı

- **Module**: `walrus_stamp::walrus_stamp`
- **Function**: `stamp_file` - blobId, fileHash ve fileName'i alır ve bir event emit eder

## Deployment

### Gereksinimler
1. Sui CLI yüklü olmalı
2. Testnet'te bir wallet ve SUI token'ları olmalı

### Deployment Adımları

```bash
# 1. Sui CLI'yi yükleyin (eğer yoksa)
cargo install --locked --git https://github.com/MystenLabs/sui.git --branch devnet sui

# 2. Wallet oluşturun veya mevcut wallet'ı kullanın
sui client active-address

# 3. Testnet'ten SUI alın (faucet)
# https://faucet.sui.io/

# 4. Contract'ı build edin
cd contracts/walrus_stamp
sui move build

# 5. Contract'ı testnet'e deploy edin
sui client publish --gas-budget 100000000

# 6. Deploy edilen package ID'yi kopyalayın
# Bu ID'yi app/page.tsx'te kullanacağız
```

## Kullanım

Deploy edildikten sonra, `app/page.tsx` dosyasında package ID'yi kullanarak contract'ı çağırabilirsiniz.

