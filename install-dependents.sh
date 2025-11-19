#!/bin/sh
npm install
npm run preview-build

cd daemon
npm install

echo "Installing lib dependencies..."
mkdir -p lib
cd lib

echo "Downloading pty_linux_x64..."
curl -L -o pty_linux_x64 https://github.com/MCSManager/PTY/releases/download/latest/pty_linux_x64
chmod +x pty_linux_x64

echo "Downloading file_zip_linux_x64..."
curl -L -o file_zip_linux_x64 https://github.com/MCSManager/Zip-Tools/releases/latest/download/file_zip_linux_x64
chmod +x file_zip_linux_x64

echo "Downloading 7z_linux_x64..."
curl -L -o 7z_linux_x64 https://github.com/MCSManager/Zip-Tools/releases/latest/download/7z_linux_x64
chmod +x 7z_linux_x64

cd ../..

cd panel
npm install
cd ../frontend
npm install

echo "------------"
echo "All done!"
echo "------------"
