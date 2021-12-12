#!/bin/bash

export $(egrep -v '^#' .env | xargs)
mysql --host=$DB_HOST --port=$DB_PORT --user=$MYSQL_USER --password=$MYSQL_PASSWORD