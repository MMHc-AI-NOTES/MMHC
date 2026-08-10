#!/bin/sh

set -eu

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "Running database migrations..."
  node build/ace.js migration:run --force

  echo "Running database seeders..."
  node build/ace db:seed -f "./database/seeders/1_user_seeder"
  node build/ace db:seed -f "./database/seeders/3_cpt_code_seeder"
  node build/ace db:seed -f "./database/seeders/5_error_type_seeder"
  node build/ace db:seed -f "./database/seeders/6_issue_description_seeder"
  node build/ace db:seed -f "./database/seeders/7_issues_related_to_seeder"
fi


if [ "$#" -eq 0 ]; then
  set -- node build/bin/server.js
fi

exec "$@"
