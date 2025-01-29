// index.js - Main file, will add more files for better reading
const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const mime = require('mime-types');

const schedule = require('node-schedule');
const archiver = require('archiver'); 

const app = express();
const port = 3657;

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Configure Multer for multiple file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = crypto.randomBytes(8).toString('hex');
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 1000 * 1024 * 1024 
    },
    fileFilter: (req, file, cb) => {
     
        cb(null, true);
    }
});

const files = new Map();

function isPreviewable(mimeType) {
    const previewableTypes = [
        'image/',
        'text/',
        'application/pdf',
        'audio/',
        'video/'
    ];
    return previewableTypes.some(type => mimeType.startsWith(type));
}

function scheduleFileDeletion(filename, expiryTime) {
    const job = schedule.scheduleJob(expiryTime, function () {
        const filePath = path.join(__dirname, 'uploads', filename);

        fs.unlink(filePath, (err) => {
            if (err) {
                console.error(`Error deleting file ${filename}:`, err);
                return;
            }

            files.delete(filename);
            console.log(`File ${filename} deleted successfully`);
        });
    });

    return job;
}

function calculateExpiryTime(duration) {
    const expiryTime = new Date();
    const match = duration.match(/^(\d+)([mhd])$/);

    if (!match) {
        expiryTime.setHours(expiryTime.getHours() + 24); 
        return expiryTime;
    }

    const [, amount, unit] = match;
    const value = parseInt(amount);

    switch (unit) {
        case 'm': // minutes
            expiryTime.setMinutes(expiryTime.getMinutes() + value);
            break;
        case 'h': // hourss
            expiryTime.setHours(expiryTime.getHours() + value);
            break;
        case 'd': // days
            expiryTime.setDate(expiryTime.getDate() + value);
            break;
        default:
            expiryTime.setHours(expiryTime.getHours() + 24); 
    }

    return expiryTime;
}


app.locals.getFileIcon = function (mimeType, originalName) {
    const ext = originalName.split('.').pop().toLowerCase();

 
    const iconMap = {
        'image/': `<svg class="w-6 h-6 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>`,

        'video/': `<svg class="w-6 h-6 text-red-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>`,

        'audio/': `<svg class="w-6 h-6 text-green-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>`,

        'application/pdf': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
  <path d="M4 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H4zm0 1h8a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z"/>
  <path d="M4.603 12.087a.8.8 0 0 1-.438-.42c-.195-.388-.13-.776.08-1.102.198-.307.526-.568.897-.787a7.7 7.7 0 0 1 1.482-.645 20 20 0 0 0 1.062-2.227 7.3 7.3 0 0 1-.43-1.295c-.086-.4-.119-.796-.046-1.136.075-.354.274-.672.65-.823.192-.077.4-.12.602-.077a.7.7 0 0 1 .477.365c.088.164.12.356.127.538.007.187-.012.395-.047.614-.084.51-.27 1.134-.52 1.794a11 11 0 0 0 .98 1.686 5.8 5.8 0 0 1 1.334.05c.364.065.734.195.96.465.12.144.193.32.2.518.007.192-.047.382-.138.563a1.04 1.04 0 0 1-.354.416.86.86 0 0 1-.51.138c-.331-.014-.654-.196-.933-.417a5.7 5.7 0 0 1-.911-.95 11.6 11.6 0 0 0-1.997.406 11.3 11.3 0 0 1-1.021 1.51c-.29.35-.608.655-.926.787a.8.8 0 0 1-.58.029"/>
</svg>
`,

        'application/zip': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"/>
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 12v4m0 0l-2-2m2 2l2-2"/>
</svg>
`,

        'application/x-rar-compressed': `<svg class="w-6 h-6 text-yellow-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>`
    };

    const extMap = {
        'doc': 'text-blue-500',
        'docx': 'text-blue-500',
        'xls': 'text-green-500',
        'xlsx': 'text-green-500',
        'ppt': 'text-orange-500',
        'pptx': 'text-orange-500',
        'pdf': 'text-red-500',
        'txt': 'text-gray-500',
        'rtf': 'text-blue-400',
        'odt': 'text-blue-600',

        'zip': 'text-yellow-500',
        'rar': 'text-yellow-500',
        '7z': 'text-yellow-500',
        'tar': 'text-yellow-600',
        'gz': 'text-yellow-600',

        'json': 'text-yellow-400',
        'xml': 'text-yellow-600',
        'html': 'text-orange-600',
        'css': 'text-blue-600',
        'js': 'text-yellow-300',
        'jsx': 'text-blue-400',
        'ts': 'text-blue-600',
        'tsx': 'text-blue-500',
        'php': 'text-purple-500',
        'py': 'text-blue-500',
        'java': 'text-red-500',
        'c': 'text-blue-700',
        'cpp': 'text-blue-700',
        'cs': 'text-purple-600',
        'sql': 'text-blue-400',
        'rb': 'text-red-600',
        'swift': 'text-orange-500',
        'go': 'text-blue-400',

        'jpg': 'text-blue-400',
        'jpeg': 'text-blue-400',
        'png': 'text-blue-500',
        'gif': 'text-blue-300',
        'svg': 'text-orange-400',
        'webp': 'text-blue-400',
        'ico': 'text-blue-300',

        'mp3': 'text-green-500',
        'wav': 'text-green-400',
        'ogg': 'text-green-600',
        'mp4': 'text-red-500',
        'avi': 'text-red-400',
        'mov': 'text-red-600',
        'wmv': 'text-red-500',

        'ttf': 'text-gray-600',
        'otf': 'text-gray-600',
        'woff': 'text-gray-500',
        'woff2': 'text-gray-500'
    };

    for (const type in iconMap) {
        if (mimeType.startsWith(type)) {
            return iconMap[type];
        }
    }

    if (extMap[ext]) {
        return `<svg class="w-6 h-6 ${extMap[ext]}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>`;
    }

    return `<svg class="w-6 h-6 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>`;
};

app.get('/', (req, res) => {
    res.render('index');
});

const fileGroups = new Map();

app.post('/upload', upload.array('files'), (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        const duration = req.body.expiry || '24h';
        const expiryTime = calculateExpiryTime(duration);

        const groupId = Date.now().toString(36) + Math.random().toString(36).substr(2);
        const filesInfo = [];

        req.files.forEach(file => {
            const mimeType = mime.lookup(file.originalname) || 'application/octet-stream';

            const fileInfo = {
                originalName: file.originalname,
                filename: file.filename,
                size: file.size,
                uploadDate: new Date(),
                expiryTime: expiryTime,
                downloads: 0,
                mimeType: mimeType,
                isPreviewable: isPreviewable(mimeType)
            };

            filesInfo.push(fileInfo);

            scheduleFileDeletion(file.filename, expiryTime);
        });

        fileGroups.set(groupId, {
            files: filesInfo,
            expiryTime: expiryTime,
            totalDownloads: 0
        });

        setTimeout(() => {
            fileGroups.delete(groupId);
        }, expiryTime - new Date());

        const downloadLink = `${req.protocol}://${req.get('host')}/files/${groupId}`;
        res.json({
            message: 'Files uploaded successfully',
            downloadLink: downloadLink,
            expiryTime: expiryTime
        });
    } catch (error) {
        console.error('Upload Error:', error);
        res.status(500).json({ error: 'Error uploading files' });
    }
});

app.get('/files/:groupId', (req, res) => {
    const groupInfo = fileGroups.get(req.params.groupId);

    if (!groupInfo) {
        return res.status(404).render('error', { message: 'Files not found or have expired' });
    }

    const timeRemaining = groupInfo.expiryTime - new Date();
    const timeRemainingStr = getTimeRemainingString(timeRemaining);

    const filesWithSize = groupInfo.files.map(file => ({
        ...file,
        readableSize: formatFileSize(file.size)
    }));

    res.render('download', {
        groupId: req.params.groupId,
        files: filesWithSize,
        timeRemaining: timeRemainingStr,
        totalFiles: groupInfo.files.length
    });
});

app.get('/download/:groupId/:filename', (req, res) => {
    const groupInfo = fileGroups.get(req.params.groupId);

    if (!groupInfo) {
        return res.status(404).render('error', { message: 'Files not found or have expired' });
    }

    const fileInfo = groupInfo.files.find(f => f.filename === req.params.filename);
    if (!fileInfo) {
        return res.status(404).render('error', { message: 'File not found' });
    }

    const filePath = path.join(__dirname, 'uploads', fileInfo.filename);

    if (!fs.existsSync(filePath)) {
        return res.status(404).render('error', { message: 'File not found or has expired' });
    }

    fileInfo.downloads++;
    res.download(filePath, fileInfo.originalName);
});

app.get('/download-all/:groupId', (req, res) => {
    const groupInfo = fileGroups.get(req.params.groupId);

    if (!groupInfo) {
        return res.status(404).render('error', { message: 'Files not found or have expired' });
    }

    const archive = archiver('zip', {
        zlib: { level: 9 } 
    });

    res.attachment('files.zip');
    archive.pipe(res);

    groupInfo.files.forEach(fileInfo => {
        const filePath = path.join(__dirname, 'uploads', fileInfo.filename);
        if (fs.existsSync(filePath)) {
            archive.file(filePath, { name: fileInfo.originalName });
        }
    });

    groupInfo.totalDownloads++;
    archive.finalize();
});

app.get('/preview/:groupId/:filename', (req, res) => {
    const groupInfo = fileGroups.get(req.params.groupId);

    if (!groupInfo) {
        return res.status(404).render('error', { message: 'File not found or has expired' });
    }

    const fileInfo = groupInfo.files.find(f => f.filename === req.params.filename);
    if (!fileInfo || !fileInfo.isPreviewable) {
        return res.status(404).render('error', { message: 'File not found or cannot be previewed' });
    }

    const filePath = path.join(__dirname, 'uploads', fileInfo.filename);
    res.sendFile(filePath);
});

function formatFileSize(size) {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}
function getTimeRemainingString(timeRemaining) {
    const minutes = Math.floor(timeRemaining / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
        return `${days} day${days > 1 ? 's' : ''} remaining`;
    } else if (hours > 0) {
        return `${hours} hour${hours > 1 ? 's' : ''} remaining`;
    } else if (minutes > 0) {
        return `${minutes} minute${minutes > 1 ? 's' : ''} remaining`;
    } else {
        const seconds = Math.floor(timeRemaining / 1000);
        return seconds > 0 ? `${seconds} seconds remaining` : 'Expiring soon';
    }
}



app.listen(port, () => {
    console.log(`File sharing app listening at http://localhost:${port}`);
});
