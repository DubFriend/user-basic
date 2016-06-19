#!/bin/bash

DATABASE="user-basic"

DATA_TABLES=()

INSTALL_PATH=install.sql

mysqldump -h192.168.50.4 \
          -uroot \
          -ppassword \
          --no-data \
          --skip-add-drop-table \
          $DATABASE \
          > $INSTALL_PATH
