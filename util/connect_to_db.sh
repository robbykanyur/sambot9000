#!/bin/bash

export $(egrep -v '^#' .env | xargs)
mysql --host=$DB_HOST --port=$DB_PORT --user=$DB_USER --password=$DB_PASS