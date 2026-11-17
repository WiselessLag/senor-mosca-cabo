#!/usr/bin/env bash
set -euo pipefail
git clone --filter=blob:none --no-checkout https://github.com/philshiu/Drosophila_brain_model.git upstream
git -C upstream sparse-checkout set --no-cone /model.py /Completeness_783.csv /Connectivity_783.parquet
git -C upstream checkout --detach 91bdd1e7dcf193f3e7ca5a8933497fcef63b7960
rm -rf upstream/.git
npm run build
