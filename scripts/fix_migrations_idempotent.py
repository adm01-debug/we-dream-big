#!/usr/bin/env python3
"""
Fix SQL migration files to be idempotent (safe to run on empty DB).

Transformations applied:
1. CREATE TABLE -> CREATE TABLE IF NOT EXISTS
2. CREATE INDEX / UNIQUE INDEX -> CREATE INDEX/UNIQUE INDEX IF NOT EXISTS
3. CREATE SEQUENCE -> CREATE SEQUENCE IF NOT EXISTS
4. CREATE VIEW -> CREATE OR REPLACE VIEW
5. CREATE MATERIALIZED VIEW -> DROP IF EXISTS before
6. CREATE FUNCTION/PROCEDURE -> CREATE OR REPLACE FUNCTION/PROCEDURE
7. CREATE TRIGGER -> DROP TRIGGER IF EXISTS before
8. CREATE POLICY -> DROP POLICY IF EXISTS before
9. CREATE TYPE AS ENUM -> wrap in DO block
10. DROP without IF EXISTS -> add IF EXISTS
11. ALTER TABLE ADD COLUMN -> ADD COLUMN IF NOT EXISTS
12. CREATE EXTENSION -> CREATE EXTENSION IF NOT EXISTS
"""

import re
import os
import sys
from pathlib import Path

MIGRATIONS_DIR = Path("/home/user/Promo_Gifts/supabase/migrations")

# The list of files NOT in production that need fixing (from the task description)
NOT_IN_PRODUCTION_TIMESTAMPS = set("""
20260107013155 20260107141013 20260107141630 20260108014732 20260108173818
20260109125132 20260109154430 20260109154850 20260109202835 20260109210025
20260110114755 20260110114831 20260110114839 20260110122053 20260201155941
20260208141021 20260211135257 20260213150148 20260213150342 20260213150532
20260213151101 20260213151403 20260214005421 20260214152115 20260215185444
20260216110718 20260216125012 20260219024635 20260219121904 20260219133353
20260220001443 20260220174735 20260222134246 20260222203852 20260226190748
20260226200633 20260301135215 20260301142954 20260301143055 20260301150840
20260304004120 20260304014416 20260304014707 20260305220938 20260306011448
20260306011719 20260306011759 20260306013723 20260312110229 20260312111512
20260312115440 20260312124638 20260314133410 20260314134333 20260314172451
20260314175106 20260314190936 20260314190948 20260314192448 20260317020422
20260317140334 20260317155554 20260317194959 20260317195011 20260317200129
20260317205124 20260317205135 20260317212837 20260317213620 20260317214344
20260317214358 20260317221652 20260317221910 20260317222414 20260317222739
20260320135344 20260320141635 20260320171208 20260321200700 20260322010007
20260322133758 20260322143211 20260322170128 20260322174557 20260322215809
20260322222206 20260322224817 20260323145546 20260323162846 20260323164400
20260323225021 20260324114359 20260324201423 20260325124134 20260325152410
20260326160831 20260326191912 20260326193116 20260326193133 20260326233438
20260330104621 20260402110456 20260402110748 20260402112639 20260404160306
20260404163500 20260404163525 20260404163550 20260404163714 20260404163738
20260404164044 20260404164132 20260404164216 20260404164259 20260404171222
20260405151750 20260405222509 20260406124228 20260406202212 20260406210155
20260406210254 20260407014300 20260410165642 20260411210929 20260412182408
20260412183140 20260412184314 20260412231916 20260412231951 20260412232015
20260412232711 20260413005750 20260414193435 20260414232135 20260414232158
20260414234635 20260415010140 20260416153503 20260416153731 20260416154332
20260416180602 20260416181632 20260416182003 20260416182133 20260416183342
20260416183415 20260416183821 20260416184056 20260416190742 20260416194706
20260416195918 20260416200125 20260416200310 20260416220648 20260416231122
20260416231145 20260416232134 20260416235610 20260417000818 20260417001408
20260417002650 20260417005020 20260417011314 20260417015121 20260417112433
20260417115234 20260417170750 20260417170948 20260417171441 20260417174309
20260418131950 20260418175315 20260418183756 20260418191039 20260419024908
20260419024928 20260419024944 20260419025022 20260419120255 20260419121414
20260419125044 20260419130037 20260419132122 20260419184445 20260419185334
20260420123931 20260420130407 20260420142509 20260420142542 20260420164558
20260420172157 20260420185009 20260423145604 20260423150337 20260423155736
20260423161848 20260423163018 20260423165603 20260423183908 20260423184705
20260423184855 20260423185624 20260423190222 20260423190831 20260423193705
20260424105620 20260424110636 20260424152415 20260424154125 20260424155746
20260424160905 20260424213841 20260425104654 20260425104801 20260425164021
20260425172528 20260425175855 20260425192845 20260425194004 20260425194941
20260425200038 20260425201131 20260425202739 20260425202806 20260425203103
20260425203612 20260425205426 20260425210505 20260425212616 20260425212807
20260425213721 20260425213902 20260425214848 20260426010557 20260426013235
20260426101255 20260426101707 20260426102150 20260426102335 20260426103109
20260426105906 20260426110946 20260426113207 20260426122751 20260426123111
20260426124539 20260426124745 20260426125603 20260426130335 20260426130639
20260426130701 20260426131442 20260426134439 20260426134707 20260426135145
20260426135521 20260426142016 20260426142609 20260426145642 20260426200011
20260426200348 20260426224900 20260427114657 20260427115542 20260427121006
20260427122230 20260427143410 20260427211500 20260427212820 20260427213016
20260427213631 20260427213832 20260427213920 20260428140401 20260429155414
20260429163414 20260429163441 20260503132831 20260503133538 20260503133611
20260503134608 20260503134916 20260503225233 20260504141259 20260507145245
20260507161547 20260512000001 20260512000002 20260512000003 20260512000004
20260512000005 20260512000006 20260512000007 20260512000008 20260512000009
20260512000010 20260512000011 20260512000012 20260512000013 20260512000014
20260512153020 20260512163615 20260512163629 20260512164738 20260512201500
20260512201600 20260512210000 20260512230000 20260512230500 20260513000001
20260513000002 20260513000003 20260513000004 20260513000005
""".split())


def should_process(filename: str) -> bool:
    """Determine if a file should be processed (not in production)."""
    stem = Path(filename).stem

    # Always process pre-2026 files (001-005, 2024*, 2025*)
    for prefix in ("001_", "002_", "003_", "004_", "005_"):
        if stem.startswith(prefix):
            return True

    if stem.startswith("20241") or stem.startswith("2025"):
        return True

    # For 2026 files, check if timestamp is in the not-in-production list
    if stem.startswith("2026"):
        ts = stem[:14]
        return ts in NOT_IN_PRODUCTION_TIMESTAMPS

    return False


def extract_quoted_name(text: str, pos: int) -> tuple[str, int]:
    """Extract a (possibly quoted) name starting at pos in text.
    Returns (name_with_quotes, end_pos).
    """
    if pos >= len(text):
        return ('', pos)

    if text[pos] == '"':
        # Double-quoted name
        end = pos + 1
        while end < len(text) and text[end] != '"':
            end += 1
        return (text[pos:end+1], end + 1)
    elif text[pos] == "'":
        # Single-quoted name
        end = pos + 1
        while end < len(text) and text[pos] != "'":
            end += 1
        return (text[pos:end+1], end + 1)
    else:
        # Unquoted name - read until whitespace or special char
        end = pos
        while end < len(text) and text[end] not in (' ', '\t', '\n', '(', ',', ';'):
            end += 1
        return (text[pos:end], end)


def fix_simple_regex(content: str) -> str:
    """Apply simple regex-based fixes."""

    # 1. CREATE EXTENSION IF NOT EXISTS
    content = re.sub(
        r'\bCREATE\s+EXTENSION\s+(?!IF\s+NOT\s+EXISTS\b)',
        'CREATE EXTENSION IF NOT EXISTS ',
        content,
        flags=re.IGNORECASE
    )

    # 2. CREATE TABLE IF NOT EXISTS
    content = re.sub(
        r'\bCREATE\s+TABLE\s+(?!IF\s+NOT\s+EXISTS\b)',
        'CREATE TABLE IF NOT EXISTS ',
        content,
        flags=re.IGNORECASE
    )

    # 3. CREATE SEQUENCE IF NOT EXISTS
    content = re.sub(
        r'\bCREATE\s+SEQUENCE\s+(?!IF\s+NOT\s+EXISTS\b)',
        'CREATE SEQUENCE IF NOT EXISTS ',
        content,
        flags=re.IGNORECASE
    )

    # 4. CREATE INDEX IF NOT EXISTS (non-CONCURRENTLY)
    # Must handle UNIQUE separately
    content = re.sub(
        r'\bCREATE\s+(UNIQUE\s+)?INDEX\s+(?!CONCURRENTLY\b)(?!IF\s+NOT\s+EXISTS\b)',
        lambda m: f'CREATE {(m.group(1) or "").upper()}INDEX IF NOT EXISTS ',
        content,
        flags=re.IGNORECASE
    )

    # 5. CREATE INDEX CONCURRENTLY -> remove CONCURRENTLY, add IF NOT EXISTS
    content = re.sub(
        r'\bCREATE\s+(UNIQUE\s+)?INDEX\s+CONCURRENTLY\s+(?!IF\s+NOT\s+EXISTS\b)',
        lambda m: f'CREATE {(m.group(1) or "").upper()}INDEX IF NOT EXISTS ',
        content,
        flags=re.IGNORECASE
    )

    # 6. CREATE OR REPLACE VIEW (not MATERIALIZED)
    # This regex must not match MATERIALIZED VIEW
    content = re.sub(
        r'\bCREATE\s+(?!OR\s+REPLACE\b)(?!MATERIALIZED\b)VIEW\s+',
        'CREATE OR REPLACE VIEW ',
        content,
        flags=re.IGNORECASE
    )

    # 7. CREATE OR REPLACE FUNCTION/PROCEDURE
    content = re.sub(
        r'\bCREATE\s+(?!OR\s+REPLACE\b)(FUNCTION|PROCEDURE)\s+',
        r'CREATE OR REPLACE \1 ',
        content,
        flags=re.IGNORECASE
    )

    # 8. ALTER TABLE ADD COLUMN IF NOT EXISTS
    content = re.sub(
        r'\bADD\s+COLUMN\s+(?!IF\s+NOT\s+EXISTS\b)',
        'ADD COLUMN IF NOT EXISTS ',
        content,
        flags=re.IGNORECASE
    )

    # 9. DROP TABLE IF EXISTS
    content = re.sub(
        r'\bDROP\s+TABLE\s+(?!IF\s+EXISTS\b)',
        'DROP TABLE IF EXISTS ',
        content,
        flags=re.IGNORECASE
    )

    # 10. DROP INDEX IF EXISTS
    content = re.sub(
        r'\bDROP\s+INDEX\s+(?!IF\s+EXISTS\b)(?!CONCURRENTLY\b)',
        'DROP INDEX IF EXISTS ',
        content,
        flags=re.IGNORECASE
    )
    content = re.sub(
        r'\bDROP\s+INDEX\s+CONCURRENTLY\s+(?!IF\s+EXISTS\b)',
        'DROP INDEX CONCURRENTLY IF EXISTS ',
        content,
        flags=re.IGNORECASE
    )

    # 11. DROP FUNCTION IF EXISTS
    content = re.sub(
        r'\bDROP\s+FUNCTION\s+(?!IF\s+EXISTS\b)',
        'DROP FUNCTION IF EXISTS ',
        content,
        flags=re.IGNORECASE
    )

    # 12. DROP PROCEDURE IF EXISTS
    content = re.sub(
        r'\bDROP\s+PROCEDURE\s+(?!IF\s+EXISTS\b)',
        'DROP PROCEDURE IF EXISTS ',
        content,
        flags=re.IGNORECASE
    )

    # 13. DROP TRIGGER IF EXISTS
    content = re.sub(
        r'\bDROP\s+TRIGGER\s+(?!IF\s+EXISTS\b)',
        'DROP TRIGGER IF EXISTS ',
        content,
        flags=re.IGNORECASE
    )

    # 14. DROP POLICY IF EXISTS
    content = re.sub(
        r'\bDROP\s+POLICY\s+(?!IF\s+EXISTS\b)',
        'DROP POLICY IF EXISTS ',
        content,
        flags=re.IGNORECASE
    )

    # 15. DROP SEQUENCE IF EXISTS
    content = re.sub(
        r'\bDROP\s+SEQUENCE\s+(?!IF\s+EXISTS\b)',
        'DROP SEQUENCE IF EXISTS ',
        content,
        flags=re.IGNORECASE
    )

    # 16. DROP VIEW IF EXISTS (but not MATERIALIZED VIEW)
    content = re.sub(
        r'\bDROP\s+(?!MATERIALIZED\b)VIEW\s+(?!IF\s+EXISTS\b)',
        'DROP VIEW IF EXISTS ',
        content,
        flags=re.IGNORECASE
    )

    # 17. DROP MATERIALIZED VIEW IF EXISTS
    content = re.sub(
        r'\bDROP\s+MATERIALIZED\s+VIEW\s+(?!IF\s+EXISTS\b)',
        'DROP MATERIALIZED VIEW IF EXISTS ',
        content,
        flags=re.IGNORECASE
    )

    # 18. DROP TYPE IF EXISTS
    content = re.sub(
        r'\bDROP\s+TYPE\s+(?!IF\s+EXISTS\b)',
        'DROP TYPE IF EXISTS ',
        content,
        flags=re.IGNORECASE
    )

    # 19. DROP SCHEMA IF EXISTS
    content = re.sub(
        r'\bDROP\s+SCHEMA\s+(?!IF\s+EXISTS\b)',
        'DROP SCHEMA IF EXISTS ',
        content,
        flags=re.IGNORECASE
    )

    return content


def fix_create_type_enum(content: str) -> str:
    """Fix CREATE TYPE AS ENUM by wrapping in DO block."""
    lines = content.split('\n')
    new_lines = []
    i = 0

    while i < len(lines):
        line = lines[i]

        # Check if this is a CREATE TYPE ... AS ENUM line
        type_match = re.match(
            r'^(\s*)CREATE\s+TYPE\s+(\S+)\s+AS\s+ENUM\s*\(',
            line,
            re.IGNORECASE
        )
        if type_match:
            indent = type_match.group(1)

            # Check if already wrapped in DO block
            already_wrapped = False
            for j in range(len(new_lines) - 1, -1, -1):
                stripped = new_lines[j].strip()
                if stripped:
                    upper = stripped.upper()
                    if upper.startswith('DO ') or upper.startswith('DO$'):
                        already_wrapped = True
                    break

            if not already_wrapped:
                # Collect the full CREATE TYPE statement (until semicolon)
                stmt_lines = [line]
                j = i + 1
                while j < len(lines) and ';' not in lines[j - 1]:
                    stmt_lines.append(lines[j])
                    j += 1
                # j is now pointing to the line after the semicolon (or we consumed too far)
                # Actually re-check: we need to find the ; in the collected lines
                stmt_lines = [line]
                j = i + 1
                accumulated = line
                while ';' not in accumulated and j < len(lines):
                    stmt_lines.append(lines[j])
                    accumulated += '\n' + lines[j]
                    j += 1

                stmt = '\n'.join(stmt_lines)
                stmt_stripped = stmt.rstrip()
                if not stmt_stripped.endswith(';'):
                    stmt_stripped += ';'

                wrapped = (
                    f'{indent}DO $$ BEGIN\n'
                    f'{stmt_stripped}\n'
                    f'{indent}EXCEPTION WHEN duplicate_object THEN NULL;\n'
                    f'{indent}END $$;'
                )
                new_lines.append(wrapped)
                i = j  # Skip lines we already consumed
                continue

        new_lines.append(line)
        i += 1

    return '\n'.join(new_lines)


def fix_create_materialized_view(content: str) -> str:
    """Fix CREATE MATERIALIZED VIEW by adding DROP IF EXISTS before."""
    lines = content.split('\n')
    new_lines = []
    i = 0

    while i < len(lines):
        line = lines[i]
        mv_match = re.match(
            r'^(\s*)CREATE\s+MATERIALIZED\s+VIEW\s+(?!IF\s+NOT\s+EXISTS\b)(\S+)',
            line,
            re.IGNORECASE
        )
        if mv_match:
            indent = mv_match.group(1)
            view_name = mv_match.group(2).rstrip('(').rstrip(';').rstrip()

            # Check if previous non-empty line already has DROP MATERIALIZED VIEW IF EXISTS
            already_dropped = False
            for j in range(len(new_lines) - 1, -1, -1):
                stripped = new_lines[j].strip()
                if stripped:
                    if 'DROP MATERIALIZED VIEW IF EXISTS' in stripped.upper():
                        already_dropped = True
                    break

            if not already_dropped:
                new_lines.append(f'{indent}DROP MATERIALIZED VIEW IF EXISTS {view_name};')

        new_lines.append(line)
        i += 1

    return '\n'.join(new_lines)


def fix_create_trigger(content: str) -> str:
    """Fix CREATE TRIGGER by adding DROP TRIGGER IF EXISTS before."""
    lines = content.split('\n')
    new_lines = []
    i = 0

    while i < len(lines):
        line = lines[i]
        # Match CREATE [CONSTRAINT] TRIGGER name
        trigger_match = re.match(
            r'^(\s*)CREATE\s+(?:CONSTRAINT\s+)?TRIGGER\s+("(?:[^"]+)"|\S+)',
            line,
            re.IGNORECASE
        )
        if trigger_match:
            indent = trigger_match.group(1)
            trigger_name = trigger_match.group(2)

            # Check if previous non-empty line already has DROP TRIGGER IF EXISTS
            already_dropped = False
            for j in range(len(new_lines) - 1, -1, -1):
                stripped = new_lines[j].strip()
                if stripped:
                    if 'DROP TRIGGER IF EXISTS' in stripped.upper():
                        already_dropped = True
                    break

            if not already_dropped:
                # Find ON table_name - scan ahead for the ON clause
                combined = ' '.join(lines[i:min(i+15, len(lines))])
                # Strip comments for matching
                combined_clean = re.sub(r'--[^\n]*', '', combined)
                on_match = re.search(
                    r'\bON\s+((?:public\.|private\.|extensions\.|backup\.|storage\.|auth\.)?(?:"[^"]+"|[A-Za-z_]\w*))',
                    combined_clean,
                    re.IGNORECASE
                )
                if on_match:
                    table_name = on_match.group(1)
                    new_lines.append(f'{indent}DROP TRIGGER IF EXISTS {trigger_name} ON {table_name};')
                # If no ON found, skip (might be inside a function body etc.)

        new_lines.append(line)
        i += 1

    return '\n'.join(new_lines)


def fix_create_policy(content: str) -> str:
    """Fix CREATE POLICY by adding DROP POLICY IF EXISTS before.

    Policy names can be quoted strings with spaces: CREATE POLICY "my name here" ON table
    """
    lines = content.split('\n')
    new_lines = []
    i = 0

    # Pattern to match beginning of CREATE POLICY line and capture the policy name
    # Policy name can be: "quoted name with spaces", 'single quoted', or unquoted_word
    policy_re = re.compile(
        r'^(\s*)CREATE\s+POLICY\s+("(?:[^"]+)"|\''  r'(?:[^\']+)' r"'|\S+)",
        re.IGNORECASE
    )

    while i < len(lines):
        line = lines[i]
        policy_match = policy_re.match(line)
        if policy_match:
            indent = policy_match.group(1)
            policy_name = policy_match.group(2)

            # Check if previous non-empty line already has DROP POLICY IF EXISTS
            already_dropped = False
            for j in range(len(new_lines) - 1, -1, -1):
                stripped = new_lines[j].strip()
                if stripped:
                    if 'DROP POLICY IF EXISTS' in stripped.upper():
                        already_dropped = True
                    break

            if not already_dropped:
                # Find ON table_name
                # The ON clause might be on the same or next lines
                combined = ' '.join(lines[i:min(i+20, len(lines))])
                combined_clean = re.sub(r'--[^\n]*', '', combined)
                on_match = re.search(
                    r'\bON\s+((?:public\.|private\.|extensions\.|backup\.|storage\.|auth\.)?(?:"[^"]+"|[A-Za-z_]\w*))',
                    combined_clean,
                    re.IGNORECASE
                )
                if on_match:
                    table_name = on_match.group(1)
                    new_lines.append(f'{indent}DROP POLICY IF EXISTS {policy_name} ON {table_name};')

        new_lines.append(line)
        i += 1

    return '\n'.join(new_lines)


def apply_all_fixes(content: str, filename: str) -> str:
    """Apply all idempotency fixes to the content."""
    content = fix_simple_regex(content)
    content = fix_create_materialized_view(content)
    content = fix_create_type_enum(content)
    content = fix_create_trigger(content)
    content = fix_create_policy(content)
    return content


def get_files_to_process():
    """Get list of files to process."""
    files = []
    for f in sorted(MIGRATIONS_DIR.glob("*.sql")):
        if f.name == "README.md":
            continue
        if should_process(f.name):
            files.append(f)
    return files


def main():
    files = get_files_to_process()
    print(f"Files to process: {len(files)}")

    modified = 0
    errors = []

    for filepath in files:
        try:
            with open(filepath, 'r', encoding='utf-8') as fh:
                original = fh.read()

            fixed = apply_all_fixes(original, filepath.name)

            if fixed != original:
                with open(filepath, 'w', encoding='utf-8') as fh:
                    fh.write(fixed)
                modified += 1
                print(f"  MODIFIED: {filepath.name}")
            else:
                print(f"  unchanged: {filepath.name}")

        except Exception as e:
            errors.append((filepath.name, str(e)))
            print(f"  ERROR: {filepath.name}: {e}")
            import traceback
            traceback.print_exc()

    print(f"\nDone. Modified: {modified}/{len(files)} files")
    if errors:
        print(f"Errors ({len(errors)}):")
        for name, err in errors:
            print(f"  {name}: {err}")

    return 0 if not errors else 1


if __name__ == "__main__":
    sys.exit(main())
