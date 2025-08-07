const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');

const app = express();

// 中间件配置
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 配置multer使用内存存储
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { 
    fileSize: 50 * 1024 * 1024 // 50MB限制
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传视频文件！'));
    }
  }
});

// 数据存储（使用内存，实际项目建议用数据库）
let videos = [];
let videoFiles = new Map();

// API路由

// 根路由
app.get('/', (req, res) => {
  res.redirect('/index.html');
});

// 获取所有视频
app.get('/api/videos', (req, res) => {
  try {
    res.json(videos);
  } catch (error) {
    res.status(500).json({ error: '获取视频列表失败' });
  }
});

// 上传视频
app.post('/api/upload', upload.single('video'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '没有上传文件' });
    }

    const videoId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const video = {
      id: videoId,
      title: req.body.title || req.file.originalname.replace(/\.[^/.]+$/, ""),
      description: req.body.description || '',
      filename: videoId + path.extname(req.file.originalname),
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      uploadDate: new Date().toISOString(),
      views: 0
    };

    // 将文件存储在内存中
    videoFiles.set(videoId, req.file.buffer);
    videos.unshift(video); // 新视频放在前面
    
    res.json({ 
      success: true,
      message: '视频上传成功', 
      video: video 
    });
  } catch (error) {
    console.error('上传错误:', error);
    res.status(500).json({ error: '上传失败: ' + error.message });
  }
});

// 获取视频流
app.get('/api/video/:id', (req, res) => {
  try {
    const videoId = req.params.id;
    const video = videos.find(v => v.id === videoId);
    
    if (!video) {
      return res.status(404).json({ error: '视频不存在' });
    }
    
    const fileBuffer = videoFiles.get(videoId);
    if (!fileBuffer) {
      return res.status(404).json({ error: '视频文件不存在' });
    }
    
    const range = req.headers.range;
    const fileSize = fileBuffer.length;
    
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': video.mimetype,
        'Cache-Control': 'no-cache'
      });
      
      res.end(fileBuffer.slice(start, end + 1));
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': video.mimetype,
        'Cache-Control': 'no-cache'
      });
      res.end(fileBuffer);
    }
  } catch (error) {
    console.error('获取视频错误:', error);
    res.status(500).json({ error: '获取视频失败' });
  }
});

// 获取视频信息并增加观看次数
app.get('/api/video-info/:id', (req, res) => {
  try {
    const video = videos.find(v => v.id === req.params.id);
    if (!video) {
      return res.status(404).json({ error: '视频不存在' });
    }
    
    video.views += 1;
    res.json(video);
  } catch (error) {
    res.status(500).json({ error: '获取视频信息失败' });
  }
});

// 删除视频
app.delete('/api/video/:id', (req, res) => {
  try {
    const videoIndex = videos.findIndex(v => v.id === req.params.id);
    if (videoIndex === -1) {
      return res.status(404).json({ error: '视频不存在' });
    }
    
    const video = videos[videoIndex];
    videoFiles.delete(video.id);
    videos.splice(videoIndex, 1);
    
    res.json({ message: '视频删除成功' });
  } catch (error) {
    res.status(500).json({ error: '删除视频失败' });
  }
});

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    videos: videos.length 
  });
});

// 导出app供Vercel使用
module.exports = app;
