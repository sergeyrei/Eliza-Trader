# @elizaos/plugin-aerodrome

This plugin provides integration with Aerodrome Finance for automated trading and liquidity provision.

## Features

- Token swaps
- Liquidity provision
- Pool management
- Optimal routing

## Installation

```bash
pnpm install @elizaos/plugin-aerodrome
```

## Configuration

Required environment variables:

```env
EVM_PRIVATE_KEY=your_private_key
```

## Usage

Add to your agent's configuration:

```json
{
    "plugins": ["@elizaos/plugin-aerodrome"],
    "settings": {
        "EVM_PRIVATE_KEY": "your_private_key"
    }
}
```

## Actions

### Swap

Swap tokens on Aerodrome:

```typescript
"Swap 100 USDC for ETH on Aerodrome";
```

### Add Liquidity

Add liquidity to Aerodrome pools:

```typescript
"Add liquidity to USDC-ETH pool on Aerodrome";
```

### Remove Liquidity

Remove liquidity from Aerodrome pools:

```typescript
"Remove liquidity from USDC-ETH pool on Aerodrome";
```
