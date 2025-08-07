const API_BASE = '/api';  // 注意这里改为相对路径
let currentVideoId = null;

// DOM 元素
const videosGrid = document.getElementById('videosGrid');
const searchInput = document.getElementById('searchInput');
const videoModal = document.getElementById('videoModal');
const modalVideo = document.getElementById('modalVideo');
const videoTitle = document.getElementById('videoTitle');
const videoDescription = document.getElementById('videoDescription');
const videoViews = document.getElementById('videoViews');
const videoDate = document.getElementById('videoDate');
const closeModal = document.querySelector('.close');
const videoCount = document.getElementById('videoCount');

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', () => {
    loadVideos();
    setupEventListeners();
    checkHealth();
});

// 设置事件监听器
function setupEventListeners() {
    // 搜索功能
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchVideos();
            }
        });
        
        // 实时搜索（防抖）
        let searchTimeout;
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                if (searchInput.value.trim()) {
                    searchVideos();
                } else {
                    loadVideos();
                }
            }, 500);
        });
    }

    // 关闭模态框
    if (closeModal) {
        closeModal.addEventListener('click', closeVideoModal);
    }
    
    // 点击模态框外部关闭
    if (videoModal) {
        window.addEventListener('click', (e) => {
            if (e.target === videoModal) {
                closeVideoModal();
            }
        });
    }

    // ESC键关闭模态框
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && videoModal && videoModal.style.display === 'block') {
            closeVideoModal();
        }
    });
}

// 检查服务器状态
async function checkHealth() {
    try {
        const response = await fetch(`${API_BASE}/health`);
        if (response.ok) {
            const health = await response.json();
            console.log('服务器状态:', health);
        }
    } catch (error) {
        console.warn('无法连接到服务器:', error);
    }
}

// 加载视频列表
async function loadVideos() {
    try {
        if (videosGrid) {
            videosGrid.innerHTML = '<div class="loading">正在加载视频...</div>';
        }
        
        const response = await fetch(`${API_BASE}/videos`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const videos = await response.json();
        
        // 更新视频数量统计
        updateVideoCount(videos.length);
        
        if (videos.length === 0) {
            if (videosGrid) {
                videosGrid.innerHTML = `
                    <div class="loading">
                        <h3>🎬 暂无视频</h3>
                        <p>成为第一个分享视频的用户吧！</p>
                        <a href="upload.html" style="color: #667eea; text-decoration: none; font-weight: 600;">
                            📤 立即上传视频
                        </a>
                    </div>
                `;
            }
            return;
        }
        
        displayVideos(videos);
    } catch (error) {
        console.error('加载视频失败:', error);
        if (videosGrid) {
            videosGrid.innerHTML = `
                <div class="loading" style="color: #e74c3c;">
                    <h3>😕 加载失败</h3>
                    <p>无法连接到服务器，请检查网络连接</p>
                    <button onclick="loadVideos()" style="margin-top: 1rem; padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer;">
                        🔄 重新加载
                    </button>
                </div>
            `;
        }
    }
}

// 更新视频数量显示
function updateVideoCount(count) {
    if (videoCount) {
        videoCount.textContent = `📊 共有 ${count} 个视频`;
    }
}

// 显示视频列表
function displayVideos(videos) {
    if (!videosGrid) return;
    
    if (videos.length === 0) {
        videosGrid.innerHTML = '<div class="loading">🔍 没有找到匹配的视频</div>';
        return;
    }
    
    videosGrid.innerHTML = videos.map(video => `
        <div class="video-card" onclick="openVideoModal('${video.id}')" data-id="${video.id}">
            <div class="video-thumbnail">
                🎬
            </div>
            <div class="video-info">
                <h3 title="${escapeHtml(video.title)}">${escapeHtml(truncateText(video.title, 50))}</h3>
                <p title="${escapeHtml(video.description || '暂无描述')}">${escapeHtml(truncateText(video.description || '暂无描述', 100))}</p>
                <div class="video-meta">
                    <span>👀 ${formatNumber(video.views)} 次观看</span>
                    <span>📅 ${formatDate(video.uploadDate)}</span>
                </div>
            </div>
        </div>
    `).join('');
    
    // 添加加载动画
    const cards = videosGrid.querySelectorAll('.video-card');
    cards.forEach((card, index) => {
        card.style.animation = `fadeInUp 0.6s ease forwards ${index * 0.1}s`;
        card.style.opacity = '0';
    });
}

// 搜索视频
async function searchVideos() {
    if (!searchInput) return;
    
    const query = searchInput.value.trim().toLowerCase();
    
    if (!query) {
        loadVideos();
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/videos`);
        const allVideos = await response.json();
        
        const filteredVideos = allVideos.filter(video =>
            video.title.toLowerCase().includes(query) ||
            (video.description && video.description.toLowerCase().includes(query))
        );
        
        updateVideoCount(filteredVideos.length);
        displayVideos(filteredVideos);
        
        // 高亮搜索结果
        if (filteredVideos.length > 0) {
            setTimeout(() => {
                highlightSearchTerms(query);
            }, 100);
        }
        
    } catch (error) {
        console.error('搜索失败:', error);
        showNotification('搜索失败，请重试', 'error');
    }
}

// 高亮搜索词
function highlightSearchTerms(query) {
    const cards = document.querySelectorAll('.video-card');
    cards.forEach(card => {
        const title = card.querySelector('h3');
        const description = card.querySelector('p');
        
        [title, description].forEach(element => {
            if (element && element.textContent) {
                const regex = new RegExp(`(${query})`, 'gi');
                element.innerHTML = element.textContent.replace(regex, '<mark style="background: #ffeb3b; padding: 2px 4px; border-radius: 3px;">$1</mark>');
            }
        });
    });
}

// 打开视频模态框
async function openVideoModal(videoId) {
    if (!videoModal || !modalVideo) return;
    
    try {
        currentVideoId = videoId;
        
        // 显示加载状态
        modalVideo.poster = '';
        videoTitle.textContent = '加载中...';
        videoDescription.textContent = '';
        videoViews.textContent = '';
        videoDate.textContent = '';
        
        // 显示模态框
        videoModal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        
        // 获取视频信息
        const response = await fetch(`${API_BASE}/video-info/${videoId}`);
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '加载失败');
        }
        
        const video = await response.json();
        
        // 设置视频源
        modalVideo.src = `${API_BASE}/video/${videoId}`;
        
        // 设置视频信息
        videoTitle.textContent = video.title;
        videoDescription.textContent = video.description || '暂无描述';
        videoViews.textContent = `👀 ${formatNumber(video.views)} 次观看`;
        videoDate.textContent = `📅 ${formatDate(video.uploadDate)}`;
        
        // 添加视频加载事件
        modalVideo.addEventListener('loadstart', () => {
            console.log('视频开始加载');
        });
        
        modalVideo.addEventListener('canplay', () => {
            console.log('视频可以播放');
        });
        
        modalVideo.addEventListener('error', (e) => {
            console.error('视频加载错误:', e);
            showNotification('视频加载失败', 'error');
        });
        
    } catch (error) {
        console.error('打开视频失败:', error);
        showNotification(`视频加载失败: ${error.message}`, 'error');
        closeVideoModal();
    }
}

// 关闭视频模态框
function closeVideoModal() {
    if (!videoModal || !modalVideo) return;
    
    videoModal.style.display = 'none';
    document.body.style.overflow = 'auto';
    
    // 停止视频播放
    modalVideo.pause();
    modalVideo.src = '';
    modalVideo.load(); // 重置视频元素
    currentVideoId = null;
}

// 删除视频
async function deleteVideo() {
    if (!currentVideoId) return;
    
    if (!confirm('确定要删除这个视频吗？\n此操作无法撤销！')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/video/${currentVideoId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showNotification('视频删除成功！', 'success');
            closeVideoModal();
            loadVideos(); // 重新加载视频列表
        } else {
            throw new Error(result.error || '删除失败');
        }
    } catch (error) {
        console.error('删除失败:', error);
        showNotification(`删除失败: ${error.message}`, 'error');
    }
}

// 显示通知
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">×</button>
    `;
    
    // 添加通知样式
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#d4edda' : type === 'error' ? '#f8d7da' : '#d1ecf1'};
        border: 1px solid ${type === 'success' ? '#c3e6cb' : type === 'error' ? '#f5c6cb' : '#bee5eb'};
        color: ${type === 'success' ? '#155724' : type === 'error' ? '#721c24' : '#0c5460'};
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        z-index: 9999;
        display: flex;
        align-items: center;
        gap: 10px;
        animation: slideInRight 0.3s ease;
        max-width: 300px;
        word-wrap: break-word;
    `;
    
    notification.querySelector('button').style.cssText = `
        background: none;
        border: none;
        font-size: 18px;
        cursor: pointer;
        color: inherit;
        opacity: 0.7;
    `;
    
    document.body.appendChild(notification);
    
    // 自动消失
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

// 工具函数

// 格式化日期
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
        return '昨天';
    } else if (diffDays < 7) {
        return `${diffDays} 天前`;
    } else if (diffDays < 30) {
        return `${Math.floor(diffDays / 7)} 周前`;
    } else if (diffDays < 365) {
        return `${Math.floor(diffDays / 30)} 个月前`;
    } else {
        return date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
}

// HTML转义
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}

// 截断文本
function truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substr(0, maxLength) + '...';
}

// 格式化数字
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

// 格式化文件大小
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 添加CSS动画
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    @keyframes slideInRight {
        from {
            opacity: 0;
            transform: translateX(100%);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    @keyframes slideOutRight {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100%);
        }
    }
`;
document.head.appendChild(style);

// 全局错误处理
window.addEventListener('error', (e) => {
    console.error('全局错误:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('未处理的Promise拒绝:', e.reason);
});

// 页面可见性变化处理
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        // 页面重新可见时检查连接
        checkHealth();
    }
});
