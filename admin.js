(function() {
    'use strict';

    var defaultCandidatesData = [
        { id: 1, name: '张三', school: '清华大学', major: '计算机科学', email: 'zhangsan@example.com', phone: '13800138001', status: 'pending', introduction: '热爱人工智能，曾参与多个AI项目开发', submitTime: '2024-01-15 10:30' },
        { id: 2, name: '李四', school: '北京大学', major: '软件工程', email: 'lisi@example.com', phone: '13800138002', status: 'screening', introduction: '全栈开发经验，熟悉Python和Java', submitTime: '2024-01-14 15:45' },
        { id: 3, name: '王五', school: '浙江大学', major: '数据科学', email: 'wangwu@example.com', phone: '13800138003', status: 'interview', introduction: 'Kaggle竞赛获奖者，擅长机器学习', submitTime: '2024-01-13 09:20' },
        { id: 4, name: '赵六', school: '上海交通大学', major: '人工智能', email: 'zhaoliu@example.com', phone: '13800138004', status: 'offer', introduction: '发表多篇AI相关论文，研究方向NLP', submitTime: '2024-01-12 14:10' },
        { id: 5, name: '孙七', school: '复旦大学', major: '计算机工程', email: 'sunqi@example.com', phone: '13800138005', status: 'pending', introduction: '参与过多个创业项目，具有产品思维', submitTime: '2024-01-11 11:00' },
        { id: 6, name: '周八', school: '南京大学', major: '自动化', email: 'zhouba@example.com', phone: '13800138006', status: 'screening', introduction: '深度学习爱好者，熟悉TensorFlow和PyTorch', submitTime: '2024-01-10 16:30' },
        { id: 7, name: '吴九', school: '中国科学技术大学', major: '计算机科学', email: 'wujiu@example.com', phone: '13800138007', status: 'interview', introduction: '算法竞赛获奖选手，ACM区域赛金牌', submitTime: '2024-01-09 08:45' },
        { id: 8, name: '郑十', school: '武汉大学', major: '信息安全', email: 'zhengshi@example.com', phone: '13800138008', status: 'rejected', introduction: '网络安全专家，曾发现多个安全漏洞', submitTime: '2024-01-08 13:20' },
        { id: 9, name: '陈十一', school: '中山大学', major: '软件工程', email: 'chenshiyi@example.com', phone: '13800138009', status: 'pending', introduction: '前端开发高手，精通React和Vue', submitTime: '2024-01-07 17:00' },
        { id: 10, name: '黄十二', school: '西安交通大学', major: '数据工程', email: 'huangshier@example.com', phone: '13800138010', status: 'screening', introduction: '大数据专家，熟悉Hadoop和Spark', submitTime: '2024-01-06 10:15' },
        { id: 11, name: '刘十三', school: '哈尔滨工业大学', major: '人工智能', email: 'liushisan@example.com', phone: '13800138011', status: 'interview', introduction: '强化学习研究方向，发表多篇顶会论文', submitTime: '2024-01-05 14:30' },
        { id: 12, name: '杨十四', school: '华中科技大学', major: '计算机科学', email: 'yangshisi@example.com', phone: '13800138012', status: 'offer', introduction: '系统架构专家，参与过多个大型项目', submitTime: '2024-01-04 09:00' }
    ];

    var candidatesData = [];
    var currentPage = 1;
    var pageSize = 8;
    var currentCandidate = null;
    var currentFilter = 'all';
    var currentSort = 'submitTime-desc';
    var duplicatePage = 1;
    var duplicatePageSize = 10;
    var adminInitialized = false;
    var notificationStatus = {
        emailConfigured: false,
        smsConfigured: false,
        smsProvider: ''
    };

    var statusLabels = {
        pending: '简历投递',
        screening: '简历筛选',
        interview: '面试评估',
        offer: '发放offer',
        rejected: '已拒绝'
    };

    var statusColors = {
        pending: 'status-pending',
        screening: 'status-screening',
        interview: 'status-interview',
        offer: 'status-offer',
        rejected: 'status-rejected'
    };

    function normalizeCandidate(candidate) {
        candidate.submitTime = candidate.submitTime || candidate.submit_time || '';
        candidate.status = candidate.status || 'pending';
        return candidate;
    }

    function escapeHtml(value) {
        return String(value || '').replace(/[&<>"']/g, function(ch) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[ch];
        });
    }

    function parseCandidateTime(value) {
        if (!value) return 0;
        var normalized = String(value).replace('T', ' ').replace(/-/g, '/');
        var date = new Date(normalized);
        return isNaN(date.getTime()) ? 0 : date.getTime();
    }

    function sortCandidates(candidates) {
        var parts = currentSort.split('-');
        var field = parts[0] || 'submitTime';
        var direction = parts[1] === 'asc' ? 1 : -1;

        return candidates.slice().sort(function(a, b) {
            var av;
            var bv;

            if (field === 'submitTime') {
                av = parseCandidateTime(a.submitTime);
                bv = parseCandidateTime(b.submitTime);
            } else {
                av = String(a[field] || '');
                bv = String(b[field] || '');
            }

            if (av < bv) return -1 * direction;
            if (av > bv) return 1 * direction;
            return parseCandidateTime(b.submitTime) - parseCandidateTime(a.submitTime);
        });
    }

    function loadCandidatesFromServer(callback) {
        if (typeof fetch === 'undefined') {
            candidatesData = [];
            if (callback) callback();
            return;
        }

        fetch('/api/candidates')
            .then(function(response) {
                if (!response.ok) throw new Error('候选人数据加载失败');
                return response.json();
            })
            .then(function(result) {
                candidatesData = (result.data || []).map(normalizeCandidate);
                if (callback) callback();
            })
            .catch(function(error) {
                console.error(error);
                candidatesData = [];
                if (callback) callback();
            });
    }

    function init() {
        initAuth();
    }

    function initAdmin() {
        if (adminInitialized) return;
        adminInitialized = true;
        initNavigation();
        initSearch();
        initFilter();
        initButtons();
        initDuplicateButtons();
        loadSettingsFromServer();
        loadNotificationStatus();
        loadCandidatesFromServer(function() {
            loadDashboard();
            loadCandidates();
        });
    }

    function initAuth() {
        var loginForm = document.getElementById('loginForm');
        var passwordInput = document.getElementById('adminPassword');
        var loginError = document.getElementById('loginError');
        var logoutBtn = document.querySelector('.logout-btn');

        function unlock() {
            document.body.classList.remove('admin-locked');
            if (loginError) loginError.textContent = '';
            if (passwordInput) passwordInput.value = '';
        }

        function lock() {
            document.body.classList.add('admin-locked');
            setTimeout(function() {
                if (passwordInput) passwordInput.focus();
            }, 0);
        }

        lock();

        if (loginForm) {
            loginForm.addEventListener('submit', function(e) {
                e.preventDefault();
                fetch('/api/admin-login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: passwordInput ? passwordInput.value : '' })
                })
                .then(function(response) {
                    if (!response.ok) throw new Error('密码不正确');
                    return response.json();
                })
                .then(function() {
                    unlock();
                    initAdmin();
                })
                .catch(function(error) {
                    if (loginError) loginError.textContent = error.message || '登录失败';
                });
            });
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', function(e) {
                e.preventDefault();
                fetch('/api/admin-logout', { method: 'POST' }).finally(function() {
                    adminInitialized = false;
                    lock();
                });
            });
        }

        fetch('/api/admin-session')
            .then(function(response) {
                if (!response.ok) throw new Error('未登录');
                return response.json();
            })
            .then(function() {
                unlock();
                initAdmin();
            })
            .catch(function() {
                lock();
            });
    }

    function initNavigation() {
        var navItems = document.querySelectorAll('.nav-item');
        for (var i = 0; i < navItems.length; i++) {
            navItems[i].addEventListener('click', function(e) {
                e.preventDefault();
                var section = this.getAttribute('data-section');
                showSection(section);
                updateNavActive(this);
            });
        }
    }

    function showSection(section) {
        var sections = document.querySelectorAll('.content-section');
        for (var i = 0; i < sections.length; i++) {
            sections[i].classList.add('hidden');
        }

        var title = document.getElementById('pageTitle');
        var subtitle = document.getElementById('pageSubtitle');

        switch(section) {
            case 'dashboard':
                document.getElementById('dashboardSection').classList.remove('hidden');
                title.innerHTML = '数据概览';
                subtitle.innerHTML = '实时监控候选人投递情况';
                loadDashboard();
                break;
            case 'candidates':
                document.getElementById('candidatesSection').classList.remove('hidden');
                title.innerHTML = '候选人管理';
                subtitle.innerHTML = '管理所有候选人信息';
                loadCandidates();
                break;
            case 'process':
                document.getElementById('processSection').classList.remove('hidden');
                title.innerHTML = '流程管理';
                subtitle.innerHTML = '跟踪招聘流程进度';
                loadProcess();
                break;
            case 'duplicates':
                document.getElementById('duplicatesSection').classList.remove('hidden');
                title.innerHTML = '查重记录';
                subtitle.innerHTML = '查看重复投递记录';
                loadDuplicates();
                break;
            case 'settings':
                document.getElementById('settingsSection').classList.remove('hidden');
                title.innerHTML = '系统设置';
                subtitle.innerHTML = '配置系统参数';
                break;
        }
    }

    function updateNavActive(activeItem) {
        var navItems = document.querySelectorAll('.nav-item');
        for (var i = 0; i < navItems.length; i++) {
            navItems[i].classList.remove('active');
        }
        activeItem.classList.add('active');
    }

    function initSearch() {
        var searchBtn = document.getElementById('searchBtn');
        var searchInput = document.getElementById('searchInput');

        if (searchBtn) {
            searchBtn.addEventListener('click', function() {
                searchCandidates(searchInput.value);
            });
        }

        if (searchInput) {
            searchInput.addEventListener('keyup', function(e) {
                if (e.key === 'Enter') {
                    searchCandidates(searchInput.value);
                }
            });
        }
    }

    function initFilter() {
        var filter = document.getElementById('statusFilter');
        if (filter) {
            filter.addEventListener('change', function() {
                currentFilter = this.value;
                currentPage = 1;
                loadCandidates();
                loadDashboard();
                loadProcess();
            });
        }
    }

    function initButtons() {
        var refreshBtn = document.getElementById('refreshBtn');
        var exportBtn = document.getElementById('exportBtn');
        var prevPage = document.getElementById('prevPage');
        var nextPage = document.getElementById('nextPage');
        var saveSettings = document.getElementById('saveSettings');
        var saveNotifications = document.getElementById('saveNotifications');
        var candidateSort = document.getElementById('candidateSort');

        if (refreshBtn) {
            refreshBtn.addEventListener('click', function() {
                loadCandidatesFromServer(function() {
                    loadCandidates();
                    loadDashboard();
                    loadProcess();
                });
            });
        }

        if (exportBtn) {
            exportBtn.addEventListener('click', exportData);
        }

        if (prevPage) {
            prevPage.addEventListener('click', function() {
                if (currentPage > 1) {
                    currentPage--;
                    loadCandidates();
                }
            });
        }

        if (nextPage) {
            nextPage.addEventListener('click', function() {
                var totalPages = Math.ceil(getFilteredCandidates().length / pageSize);
                if (currentPage < totalPages) {
                    currentPage++;
                    loadCandidates();
                }
            });
        }

        if (saveSettings) {
            saveSettings.addEventListener('click', saveSettingsData);
        }

        if (saveNotifications) {
            saveNotifications.addEventListener('click', saveNotificationSettings);
        }

        if (candidateSort) {
            candidateSort.value = currentSort;
            candidateSort.addEventListener('change', function() {
                currentSort = this.value;
                currentPage = 1;
                loadCandidates();
            });
        }
    }

    function initDuplicateButtons() {
        var refreshBtn = document.getElementById('refreshDuplicatesBtn');
        var clearBtn = document.getElementById('clearDuplicatesBtn');
        var prevPage = document.getElementById('prevDuplicatePage');
        var nextPage = document.getElementById('nextDuplicatePage');

        if (refreshBtn) {
            refreshBtn.addEventListener('click', loadDuplicates);
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', clearDuplicates);
        }

        if (prevPage) {
            prevPage.addEventListener('click', function() {
                if (duplicatePage > 1) {
                    duplicatePage--;
                    loadDuplicates();
                }
            });
        }

        if (nextPage) {
            nextPage.addEventListener('click', function() {
                fetchDuplicateRecords(function(duplicateRecords) {
                    var totalPages = Math.ceil(duplicateRecords.length / duplicatePageSize);
                    if (duplicatePage < totalPages) {
                        duplicatePage++;
                        loadDuplicates();
                    }
                });
            });
        }
    }

    function loadSettingsFromServer() {
        fetch('/api/settings')
            .then(function(response) {
                if (!response.ok) throw new Error('设置加载失败');
                return response.json();
            })
            .then(function(result) {
                var settings = result.data || {};
                var deadline = document.getElementById('deadlineInput');
                var filterRule = document.getElementById('filterRule');
                var emailNotify = document.getElementById('emailNotify');
                var smsNotify = document.getElementById('smsNotify');
                var interviewRemind = document.getElementById('interviewRemind');

                if (deadline) deadline.value = settings.deadline || '';
                if (filterRule) filterRule.value = settings.filterRule || 'normal';
                if (emailNotify) emailNotify.checked = settings.emailNotify !== false;
                if (smsNotify) smsNotify.checked = settings.smsNotify === true;
                if (interviewRemind) interviewRemind.checked = settings.interviewRemind !== false;
            })
            .catch(function(error) {
                console.error(error);
            });
    }

    function loadNotificationStatus() {
        fetch('/api/notification-status')
            .then(function(response) {
                if (!response.ok) throw new Error('通知通道状态加载失败');
                return response.json();
            })
            .then(function(result) {
                notificationStatus = result.data || notificationStatus;
                updateNotificationHint();
            })
            .catch(function(error) {
                console.error(error);
                updateNotificationHint();
            });
    }

    function updateNotificationHint() {
        var hint = document.getElementById('notificationStatusHint');
        if (!hint) return;

        var emailText = notificationStatus.emailConfigured ? '邮件通道已配置' : '邮件通道未配置 SMTP';
        var smsText = notificationStatus.smsConfigured ? '短信通道已配置' : '短信通道未配置';
        hint.textContent = emailText + '；' + smsText + '。状态变更时会按开关尝试通知候选人。';
    }

    function getFilteredCandidates() {
        var filtered;
        if (currentFilter === 'all') {
            filtered = candidatesData;
        } else {
            filtered = candidatesData.filter(function(c) {
                return c.status === currentFilter;
            });
        }
        return sortCandidates(filtered);
    }

    function searchCandidates(keyword) {
        if (!keyword.trim()) {
            loadCandidates();
            return;
        }

        var keywordLower = keyword.toLowerCase();
        var filtered = candidatesData.filter(function(c) {
            return c.name.toLowerCase().includes(keywordLower) ||
                   c.school.toLowerCase().includes(keywordLower) ||
                   c.major.toLowerCase().includes(keywordLower) ||
                   c.email.toLowerCase().includes(keywordLower);
        });

        renderCandidateTable(sortCandidates(filtered));
    }

    function loadDashboard() {
        var filtered = getFilteredCandidates();

        var totalCount = filtered.length;
        var screeningCount = filtered.filter(function(c) { return c.status === 'screening'; }).length;
        var interviewCount = filtered.filter(function(c) { return c.status === 'interview'; }).length;
        var offerCount = filtered.filter(function(c) { return c.status === 'offer'; }).length;

        document.getElementById('totalCount').innerHTML = totalCount;
        document.getElementById('screeningCount').innerHTML = screeningCount;
        document.getElementById('interviewCount').innerHTML = interviewCount;
        document.getElementById('offerCount').innerHTML = offerCount;
    }

    function loadCandidates() {
        var filtered = getFilteredCandidates();
        var start = (currentPage - 1) * pageSize;
        var end = start + pageSize;
        var paginated = filtered.slice(start, end);

        renderCandidateTable(paginated);
        updatePagination(filtered.length);
    }

    function renderCandidateTable(candidates) {
        var table = document.getElementById('candidatesTable');
        if (!table) return;

        table.innerHTML = '';

        if (candidates.length === 0) {
            table.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 30px;">暂无候选人数据</td></tr>';
            return;
        }

        for (var i = 0; i < candidates.length; i++) {
            var c = candidates[i];
            var row = document.createElement('tr');
            var resumeCell = c.resume
                ? '<a class="resume-link" href="/uploads/' + encodeURIComponent(c.resume) + '" target="_blank" rel="noopener">查看/下载</a>'
                : '<span class="muted-text">无</span>';
            row.innerHTML = '<td>' + escapeHtml(c.name) + '</td>' +
                '<td>' + escapeHtml(c.school) + '</td>' +
                '<td>' + escapeHtml(c.major) + '</td>' +
                '<td>' + escapeHtml(c.email) + '</td>' +
                '<td><span class="status-badge ' + statusColors[c.status] + '">' + escapeHtml(statusLabels[c.status]) + '</span></td>' +
                '<td>' + escapeHtml(c.submitTime) + '</td>' +
                '<td>' + resumeCell + '</td>' +
                '<td>' +
                    '<button class="action-btn view" onclick="viewCandidate(\'' + c.id + '\')">查看</button>' +
                    (c.status !== 'offer' && c.status !== 'rejected' ?
                        '<button class="action-btn edit" onclick="editCandidate(\'' + c.id + '\')">编辑</button>' : '') +
                '</td>';
            table.appendChild(row);
        }
    }

    function updatePagination(total) {
        var totalPages = Math.ceil(total / pageSize);
        var pageInfo = document.getElementById('pageInfo');
        var prevPage = document.getElementById('prevPage');
        var nextPage = document.getElementById('nextPage');

        if (pageInfo) {
            pageInfo.innerHTML = '第 ' + currentPage + ' / ' + totalPages + ' 页';
        }

        if (prevPage) {
            prevPage.disabled = currentPage <= 1;
        }

        if (nextPage) {
            nextPage.disabled = currentPage >= totalPages;
        }
    }

    function loadProcess() {
        var filtered = getFilteredCandidates();

        var step1Count = filtered.filter(function(c) { return c.status === 'pending'; }).length;
        var step2Count = filtered.filter(function(c) { return c.status === 'screening'; }).length;
        var step3Count = filtered.filter(function(c) { return c.status === 'interview'; }).length;
        var step4Count = filtered.filter(function(c) { return c.status === 'offer'; }).length;

        document.getElementById('step1Count').innerHTML = step1Count;
        document.getElementById('step2Count').innerHTML = step2Count;
        document.getElementById('step3Count').innerHTML = step3Count;
        document.getElementById('step4Count').innerHTML = step4Count;
    }

    function normalizeDuplicate(record) {
        record.duplicateField = record.duplicateField || (String(record.duplicate_type || '').indexOf('phone') !== -1 ? 'phone' : 'email');
        record.submitTime = record.submitTime || record.submit_time || '';
        record.existingCandidateName = record.existingCandidateName || '未知';
        record.existingCandidateSchool = record.existingCandidateSchool || '未知';
        return record;
    }

    function fetchDuplicateRecords(callback) {
        if (typeof fetch === 'undefined') {
            callback([]);
            return;
        }

        fetch('/api/duplicates')
            .then(function(response) {
                if (!response.ok) throw new Error('查重记录加载失败');
                return response.json();
            })
            .then(function(result) {
                callback((result.data || []).map(normalizeDuplicate));
            })
            .catch(function(error) {
                console.error(error);
                callback([]);
            });
    }

    function loadDuplicates() {
        fetchDuplicateRecords(function(records) {
            var totalCount = records.length;
            var phoneCount = records.filter(function(r) { return r.duplicateField === 'phone'; }).length;
            var emailCount = records.filter(function(r) { return r.duplicateField === 'email'; }).length;

            document.getElementById('duplicateTotalCount').innerHTML = totalCount;
            document.getElementById('duplicatePhoneCount').innerHTML = phoneCount;
            document.getElementById('duplicateEmailCount').innerHTML = emailCount;

            var start = (duplicatePage - 1) * duplicatePageSize;
            var end = start + duplicatePageSize;
            var paginated = records.slice(start, end);

            renderDuplicateTable(paginated);
            updateDuplicatePagination(totalCount);
        });
    }

    function renderDuplicateTable(records) {
        var table = document.getElementById('duplicatesTable');
        if (!table) return;

        table.innerHTML = '';

        if (records.length === 0) {
            table.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 30px;">暂无查重记录</td></tr>';
            return;
        }

        for (var i = 0; i < records.length; i++) {
            var r = records[i];
            var duplicateType = r.duplicateField === 'phone' ? '手机号重复' : '邮箱重复';
            var conflictInfo = r.existingCandidateName + ' (' + r.existingCandidateSchool + ')';

            var row = document.createElement('tr');
            row.innerHTML = '<td>' + r.name + '</td>' +
                '<td>' + r.school + '</td>' +
                '<td>' + r.major + '</td>' +
                '<td>' + r.phone + '</td>' +
                '<td>' + r.email + '</td>' +
                '<td><span class="status-badge status-rejected">' + duplicateType + '</span></td>' +
                '<td>' + conflictInfo + '</td>' +
                '<td>' + r.submitTime + '</td>';
            table.appendChild(row);
        }
    }

    function updateDuplicatePagination(total) {
        var totalPages = Math.ceil(total / duplicatePageSize);
        var pageInfo = document.getElementById('duplicatePageInfo');
        var prevPage = document.getElementById('prevDuplicatePage');
        var nextPage = document.getElementById('nextDuplicatePage');

        if (pageInfo) {
            pageInfo.innerHTML = '第 ' + duplicatePage + ' / ' + (totalPages || 1) + ' 页';
        }

        if (prevPage) {
            prevPage.disabled = duplicatePage <= 1;
        }

        if (nextPage) {
            nextPage.disabled = duplicatePage >= totalPages;
        }
    }

    function clearDuplicates() {
        if (confirm('确定要清空所有查重记录吗？')) {
            fetch('/api/duplicates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'clear' })
            })
            .then(function(response) {
                if (!response.ok) throw new Error('清空失败');
                duplicatePage = 1;
                loadDuplicates();
                alert('查重记录已清空');
            })
            .catch(function(error) {
                console.error(error);
                alert('清空失败，请稍后重试');
            });
        }
    }

    window.viewCandidate = function(id) {
        currentCandidate = candidatesData.find(function(c) { return String(c.id) === String(id); });

        if (!currentCandidate) return;

        var modal = document.getElementById('candidateModal');
        var modalTitle = document.getElementById('modalTitle');
        var modalBody = document.getElementById('modalBody');
        var passBtn = document.getElementById('passBtn');
        var rejectBtn = document.getElementById('rejectBtn');

        var resumeHtml = currentCandidate.resume
            ? '<a class="resume-link" href="/uploads/' + encodeURIComponent(currentCandidate.resume) + '" target="_blank" rel="noopener">查看/下载简历</a>'
            : '无';

        modalTitle.innerHTML = '候选人详情 - ' + escapeHtml(currentCandidate.name);
        modalBody.innerHTML = '<div class="detail-row"><span class="detail-label">姓名</span><span class="detail-value">' + escapeHtml(currentCandidate.name) + '</span></div>' +
            '<div class="detail-row"><span class="detail-label">院校</span><span class="detail-value">' + escapeHtml(currentCandidate.school) + '</span></div>' +
            '<div class="detail-row"><span class="detail-label">专业</span><span class="detail-value">' + escapeHtml(currentCandidate.major) + '</span></div>' +
            '<div class="detail-row"><span class="detail-label">邮箱</span><span class="detail-value">' + escapeHtml(currentCandidate.email) + '</span></div>' +
            '<div class="detail-row"><span class="detail-label">手机</span><span class="detail-value">' + escapeHtml(currentCandidate.phone) + '</span></div>' +
            '<div class="detail-row"><span class="detail-label">状态</span><span class="detail-value"><span class="status-badge ' + statusColors[currentCandidate.status] + '">' + escapeHtml(statusLabels[currentCandidate.status]) + '</span></span></div>' +
            '<div class="detail-row"><span class="detail-label">投递时间</span><span class="detail-value">' + escapeHtml(currentCandidate.submitTime) + '</span></div>' +
            '<div class="detail-row"><span class="detail-label">简历附件</span><span class="detail-value">' + resumeHtml + '</span></div>' +
            '<h4>自我介绍</h4><p style="color: #666; line-height: 1.6; white-space: pre-wrap;">' + escapeHtml(currentCandidate.introduction || '无') + '</p>';

        passBtn.style.display = currentCandidate.status !== 'offer' && currentCandidate.status !== 'rejected' ? 'inline-block' : 'none';
        rejectBtn.style.display = currentCandidate.status !== 'rejected' ? 'inline-block' : 'none';

        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    };

    window.closeModal = function() {
        var modal = document.getElementById('candidateModal');
        modal.classList.remove('show');
        document.body.style.overflow = 'auto';
        currentCandidate = null;
    };

    window.updateStatus = function(action) {
        if (!currentCandidate) return;

        var candidateIndex = -1;
        for (var i = 0; i < candidatesData.length; i++) {
            if (String(candidatesData[i].id) === String(currentCandidate.id)) {
                candidateIndex = i;
                break;
            }
        }

        if (candidateIndex === -1) return;

        if (action === 'pass') {
            var nextStatus = getNextStatus(candidatesData[candidateIndex].status);
            candidatesData[candidateIndex].status = nextStatus;
        } else if (action === 'reject') {
            candidatesData[candidateIndex].status = 'rejected';
        }

        fetch('/api/candidates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'update',
                id: currentCandidate.id,
                status: candidatesData[candidateIndex].status
            })
        })
        .then(function(response) {
            if (!response.ok) throw new Error('状态更新失败');
            return response.json();
        })
        .then(function(result) {
            loadCandidatesFromServer(function() {
                loadCandidates();
                loadDashboard();
                loadProcess();
                closeModal();
            });
            showNotificationResult(result.notifications);
        })
        .catch(function(error) {
            console.error(error);
            alert('状态更新失败，请稍后重试');
        });
    };

    function getNextStatus(current) {
        var order = ['pending', 'screening', 'interview', 'offer'];
        var index = order.indexOf(current);
        if (index < order.length - 1) {
            return order[index + 1];
        }
        return current;
    }

    window.showStepCandidates = function(status) {
        currentFilter = status;
        currentPage = 1;
        showSection('candidates');
    };

    window.editCandidate = function(id) {
        viewCandidate(id);
    };

    function exportData() {
        var filtered = getFilteredCandidates();
        var headers = ['姓名', '院校', '专业', '邮箱', '手机', '状态', '投递时间'];
        var rows = filtered.map(function(c) {
            return [c.name, c.school, c.major, c.email, c.phone, statusLabels[c.status], c.submitTime];
        });

        var csv = headers.join(',') + '\n' + rows.map(function(row) {
            return row.join(',');
        }).join('\n');

        var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        var link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'candidates_' + new Date().toISOString().split('T')[0] + '.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function saveSettingsData() {
        var deadline = document.getElementById('deadlineInput').value;
        var rule = document.getElementById('filterRule').value;

        alert('设置已保存！\n招聘截止日期: ' + (deadline || '未设置') + '\n筛选规则: ' + rule);
    }

    function saveNotificationSettings() {
        var emailNotify = document.getElementById('emailNotify').checked;
        var smsNotify = document.getElementById('smsNotify').checked;
        var interviewRemind = document.getElementById('interviewRemind').checked;

        fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                deadline: document.getElementById('deadlineInput').value,
                filterRule: document.getElementById('filterRule').value,
                emailNotify: emailNotify,
                smsNotify: smsNotify,
                interviewRemind: interviewRemind
            })
        })
        .then(function(response) {
            if (!response.ok) throw new Error('通知设置保存失败');
            return response.json();
        })
        .then(function() {
            loadNotificationStatus();
            var warnings = [];
            if (emailNotify && !notificationStatus.emailConfigured) {
                warnings.push('邮件通知已开启，但 SMTP 尚未配置，暂时无法真实发送邮件。');
            }
            if (smsNotify && !notificationStatus.smsConfigured) {
                warnings.push('短信通知已开启，但短信通道尚未配置，暂时无法真实发送短信。');
            }
            alert('通知设置已保存。\n邮件通知: ' + (emailNotify ? '开启' : '关闭') + '\n短信通知: ' + (smsNotify ? '开启' : '关闭') + '\n面试提醒: ' + (interviewRemind ? '开启' : '关闭') + (warnings.length ? '\n\n' + warnings.join('\n') : ''));
        })
        .catch(function(error) {
            console.error(error);
            alert(error.message || '通知设置保存失败');
        });
    }

    function showNotificationResult(result) {
        if (!result) return;

        if (result.errors && result.errors.length) {
            alert('候选人状态已更新，但通知发送存在问题：\n' + result.errors.join('\n'));
            return;
        }

        if (result.email === 'sent' || result.sms === 'sent') {
            alert('候选人状态已更新，通知已发送。');
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
