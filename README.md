# DedupX

A fast CLI tool for deduplicating database records using configurable similarity rules. Built with Bun.

## Features

- **Multiple Comparison Algorithms**: exact, fuzzy, soundex, ngram, numeric
- **Flexible Configuration**: YAML-based configuration with weighted rules
- **Parallel Processing**: Worker pool with configurable concurrency
- **Blocking Strategies**: Reduce comparison space with blocking columns
- **Progress Tracking**: Real-time progress bars and detailed logging
- **Database Support**: PostgreSQL, MySQL, SQLite

## Install

```bash
bun install
```

## Quick Start

1. Create a configuration file (see `config.example.yaml` for reference):

```yaml
source:
  connection: "postgres://user:password@localhost:5432/mydb"
  driver: "postgres"
  table: "users"

rules:
  - name: "email_match"
    columns: ["email"]
    comparator: "exact"
    weight: 1.0
  - name: "name_similarity"
    columns: ["first_name", "last_name"]
    comparator: "fuzzy"
    weight: 0.8

threshold: 0.85

processing:
  strategy: "block"
  blocking_column: "email_domain"
  batch_size: 500
  concurrency: 4
```

2. Run deduplication:

```bash
bun run index.ts run -c config.yaml
```

Or run the built binary:

```bash
./dedupx run -c config.yaml
```

## Commands

### `run`

Runs the deduplication process based on the provided configuration.

```bash
bun run index.ts run -c config.yaml
```

### `check`

Validates the configuration file and tests the database connection.

```bash
bun run index.ts check -c config.yaml
```

### `rules`

Dry-run: shows which rules would fire for a sample of data without writing results.

```bash
bun run index.ts rules -c config.yaml -s 100
```

Options:
- `-s, --sample-size <number>` - Number of rows to fetch for dry-run (default: 100)

## Configuration Reference

### Source

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connection` | string | Yes | Database connection string (URI format) |
| `driver` | string | Yes | Database driver: `postgres`, `mysql`, or `sqlite` |
| `table` | string | Yes | Source table name to deduplicate |

### Rules

Array of rules defining how to compare records. Each rule consists of:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | Human-readable name for the rule |
| `columns` | array | Yes | List of column names to compare (concatenated for comparison) |
| `comparator` | string | Yes | Comparison algorithm: `exact`, `fuzzy`, `soundex`, `ngram`, `numeric` |
| `weight` | number | No | Weight for weighted averaging (0-1), default: 1.0 |
| `options` | object | No | Comparator-specific options |

#### Comparator Details

| Comparator | Description | Options |
|------------|-------------|---------|
| `exact` | Exact string match | None |
| `fuzzy` | Levenshtein distance-based similarity | `threshold`: minimum similarity (default: 0.8) |
| `soundex` | Phonetic algorithm matching | None |
| `ngram` | N-gram based similarity | `n`: n-gram size (default: 3), `threshold`: minimum similarity |
| `numeric` | Numeric comparison | `tolerance`: allowed difference for numbers |

### Threshold

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `threshold` | number | Yes | Similarity threshold (0-1) to consider records as duplicates |

### Processing

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `strategy` | string | No | Comparison strategy: `block` or `full_scan` (default: `block`) |
| `blocking_column` | string | Only if strategy is `block` | Column to group records for blocking |
| `batch_size` | number | No | Number of rows to process in one batch (default: 500) |
| `concurrency` | number | No | Number of parallel workers (default: 4) |

### Output

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `schema` | string | No | Output schema name (for databases that support schemas) |

## Sample Configuration

### Basic Email Deduplication

```yaml
source:
  connection: "postgres://user:pass@localhost:5432/db"
  driver: "postgres"
  table: "customers"

rules:
  - name: "email_exact"
    columns: ["email"]
    comparator: "exact"
    weight: 1.0

threshold: 1.0

processing:
  strategy: "block"
  blocking_column: "email"
```

### Multi-Column Person Deduplication

```yaml
source:
  connection: "sqlite://data.db"
  driver: "sqlite"
  table: "people"

rules:
  - name: "full_name"
    columns: ["first_name", "last_name"]
    comparator: "fuzzy"
    weight: 0.9
    options:
      threshold: 0.85
  - name: "phone_exact"
    columns: ["phone"]
    comparator: "exact"
    weight: 1.0
  - name: "address_soundex"
    columns: ["address"]
    comparator: "soundex"
    weight: 0.7

threshold: 0.8

processing:
  strategy: "block"
  blocking_column: "zip_code"
  concurrency: 8
```

### Fuzzy Product Deduplication

```yaml
source:
  connection: "mysql://user:pass@localhost:3306/inventory"
  driver: "mysql"
  table: "products"

rules:
  - name: "product_name"
    columns: ["name", "brand"]
    comparator: "ngram"
    weight: 1.0
    options:
      n: 3
      threshold: 0.7
  - name: "sku_exact"
    columns: ["sku"]
    comparator: "exact"
    weight: 1.0
  - name: "price_numeric"
    columns: ["price"]
    comparator: "numeric"
    weight: 0.5
    options:
      tolerance: 1.0

threshold: 0.75

processing:
  strategy: "full_scan"
  concurrency: 4
  batch_size: 1000
```

## Output

After running deduplication, results are written to a new table with the format `{table}_dedup_{timestamp}`. The output contains:

- Original record IDs
- Group IDs (all records in the same group are considered duplicates)
- Canonical (representative) record for each group

## Build

```bash
bun run build   # outputs 'dedupx' binary
bun run clean  # removes binary
```

## Run with Hot Reload

```bash
bun --hot src/index.ts run -c config.yaml
```