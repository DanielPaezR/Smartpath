#!/bin/bash
cd /home/daniel.paez/Smartpath/backend
node generate-routes.js >> /var/log/smartpath_routes.log 2>&1