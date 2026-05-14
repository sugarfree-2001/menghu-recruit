(function() {
    'use strict';

    if (typeof NodeList !== 'undefined' && NodeList.prototype && !NodeList.prototype.forEach) {
        NodeList.prototype.forEach = Array.prototype.forEach;
    }

    if (typeof Element !== 'undefined' && !Element.prototype.addEventListener) {
        Element.prototype.addEventListener = function(type, listener) {
            return this.attachEvent('on' + type, listener);
        };
        Element.prototype.removeEventListener = function(type, listener) {
            return this.detachEvent('on' + type, listener);
        };
    }

    function addClass(element, className) {
        if (element.classList) {
            element.classList.add(className);
        } else {
            var currentClass = element.className || '';
            if (currentClass.indexOf(className) === -1) {
                element.className = currentClass + (currentClass ? ' ' : '') + className;
            }
        }
    }

    function removeClass(element, className) {
        if (element.classList) {
            element.classList.remove(className);
        } else {
            var currentClass = element.className || '';
            var classNames = currentClass.split(' ');
            var newClassNames = [];
            for (var i = 0; i < classNames.length; i++) {
                if (classNames[i] !== className) {
                    newClassNames.push(classNames[i]);
                }
            }
            element.className = newClassNames.join(' ');
        }
    }

    function smoothScrollTo(element, offset) {
        var targetPosition = element.offsetTop - offset;
        if ('scrollBehavior' in document.documentElement.style) {
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        } else {
            var startPosition = window.pageYOffset;
            var change = targetPosition - startPosition;
            var currentTime = 0;
            var increment = 20;
            var duration = 500;

            function animateScroll() {
                currentTime += increment;
                var val = Math.easeInOutQuad(currentTime, startPosition, change, duration);
                window.scrollTo(0, val);
                if (currentTime < duration) {
                    setTimeout(animateScroll, increment);
                }
            }

            Math.easeInOutQuad = function(t, b, c, d) {
                t /= d / 2;
                if (t < 1) return c / 2 * t * t + b;
                t--;
                return -c / 2 * (t * (t - 2) - 1) + b;
            };

            animateScroll();
        }
    }

    function initUploadArea() {
        var uploadArea = document.getElementById('uploadArea');
        var fileInput = document.getElementById('resume');
        var fileInfo = document.getElementById('fileInfo');

        if (!uploadArea || !fileInput || !fileInfo) return;

        uploadArea.addEventListener('click', function(e) {
            if (e.target.tagName !== 'INPUT') {
                fileInput.click();
            }
        });

        uploadArea.addEventListener('dragover', function(e) {
            e.preventDefault();
            e.stopPropagation();
            addClass(uploadArea, 'dragover');
        });

        uploadArea.addEventListener('dragleave', function(e) {
            e.preventDefault();
            e.stopPropagation();
            removeClass(uploadArea, 'dragover');
        });

        uploadArea.addEventListener('drop', function(e) {
            e.preventDefault();
            e.stopPropagation();
            removeClass(uploadArea, 'dragover');

            var files = e.dataTransfer && e.dataTransfer.files;
            if (files && files.length > 0) {
                handleFile(files[0]);
            }
        });

        fileInput.addEventListener('change', function(e) {
            var files = e.target.files;
            if (files && files.length > 0) {
                handleFile(files[0]);
            }
        });

        window.clearFile = function() {
            fileInput.value = '';
            fileInfo.className = fileInfo.className.replace(/show/g, '').trim();
            fileInfo.innerHTML = '';
        };

        function handleFile(file) {
            var allowedTypes = [
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            ];
            var maxSize = 10 * 1024 * 1024;

            if (allowedTypes.indexOf(file.type) === -1) {
                alert('请上传PDF、DOC或DOCX格式的文件');
                return;
            }

            if (file.size > maxSize) {
                alert('文件大小不能超过10MB');
                return;
            }

            var buttonHtml = '<button type="button" id="clearFileBtn" style="background: #ff4d4f; color: white; border: none; padding: 5px 15px; border-radius: 5px; cursor: pointer;">移除</button>';
            var fileNameSpan = '<span style="word-break: break-all;">' + file.name + '</span>';
            fileInfo.innerHTML = '<div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;"><div style="display: flex; align-items: center; gap: 10px;"><span style="font-size: 1.5rem;">📄</span>' + fileNameSpan + '</div>' + buttonHtml + '</div>';
            addClass(fileInfo, 'show');

            setTimeout(function() {
                var clearBtn = document.getElementById('clearFileBtn');
                if (clearBtn) {
                    clearBtn.addEventListener('click', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        window.clearFile();
                    });
                }
            }, 0);
        }
    }

    function checkDuplicate(phone, email) {
        var candidatesData = [];
        try {
            var stored = localStorage.getItem('wohuCandidates');
            if (stored) {
                candidatesData = JSON.parse(stored);
            }
        } catch (e) {
            candidatesData = [];
        }

        for (var i = 0; i < candidatesData.length; i++) {
            var c = candidatesData[i];
            if (c.phone === phone) {
                return { duplicate: true, field: 'phone', candidate: c };
            }
            if (c.email === email) {
                return { duplicate: true, field: 'email', candidate: c };
            }
        }
        return { duplicate: false };
    }

    function addDuplicateRecord(formData, matchedCandidate) {
        var duplicateRecords = [];
        try {
            var stored = localStorage.getItem('wohuDuplicateRecords');
            if (stored) {
                duplicateRecords = JSON.parse(stored);
            }
        } catch (e) {
            duplicateRecords = [];
        }

        var record = {
            id: Date.now(),
            name: formData.name,
            phone: formData.phone,
            email: formData.email,
            school: formData.school,
            major: formData.major,
            submitTime: new Date().toLocaleString('zh-CN'),
            duplicateField: matchedCandidate.phone === formData.phone ? 'phone' : 'email',
            existingCandidateName: matchedCandidate.name,
            existingCandidateSchool: matchedCandidate.school
        };

        duplicateRecords.unshift(record);

        try {
            localStorage.setItem('wohuDuplicateRecords', JSON.stringify(duplicateRecords));
        } catch (e) {
            console.error('保存查重记录失败:', e);
        }
    }

    function initForm() {
        var form = document.getElementById('applicationForm');
        var modal = document.getElementById('successModal');
        var modalClose = document.querySelector('.modal-close');
        var duplicateModal = document.getElementById('duplicateModal');
        var duplicateModalClose = document.getElementById('duplicateModalClose');
        var duplicateMessage = document.getElementById('duplicateMessage');

        if (!form || !modal || !modalClose) return;

        if (duplicateModalClose) {
            duplicateModalClose.addEventListener('click', function() {
                removeClass(duplicateModal, 'show');
                document.body.style.overflow = 'auto';
            });
        }

        if (duplicateModal) {
            duplicateModal.addEventListener('click', function(e) {
                if (e.target === duplicateModal && duplicateModalClose) {
                    duplicateModalClose.click();
                }
            });
        }

        form.addEventListener('submit', function(e) {
            e.preventDefault();

            var formData = {
                name: form.querySelector('#name').value.trim(),
                email: form.querySelector('#email').value.trim(),
                phone: form.querySelector('#phone').value.trim(),
                school: form.querySelector('#school').value.trim(),
                major: form.querySelector('#major').value.trim(),
                introduction: form.querySelector('#introduction').value.trim()
            };

            var phoneInput = form.querySelector('#phone');
            var emailInput = form.querySelector('#email');

            if (!phoneInput.value.trim() || !emailInput.value.trim()) {
                alert('请填写手机号和邮箱');
                return;
            }

            var duplicateResult = checkDuplicate(formData.phone, formData.email);

            if (duplicateResult.duplicate) {
                var fieldText = duplicateResult.field === 'phone' ? '手机号' : '邮箱';
                duplicateMessage.innerHTML = '检测到您提交的' + fieldText + '已在系统中存在（候选人：' + duplicateResult.candidate.name + '，院校：' + duplicateResult.candidate.school + '），无法重复投递。\n\n此次投递已记录到查重日志中。';
                addClass(duplicateModal, 'show');
                document.body.style.overflow = 'hidden';

                addDuplicateRecord(formData, duplicateResult.candidate);
                return;
            }

            if (typeof fetch !== 'undefined') {
                fetch('https://api.example.com/apply', {
                    method: 'POST',
                    body: new FormData(form)
                })
                .then(function(response) {
                    if (!response.ok) {
                        throw new Error('网络请求失败');
                    }
                    return response.json();
                })
                .then(function(data) {
                    if (typeof console !== 'undefined') {
                        console.log('提交成功:', data);
                    }
                    saveCandidateToStorage(formData);
                    showSuccessModal();
                })
                .catch(function(error) {
                    if (typeof console !== 'undefined') {
                        console.error('提交失败:', error);
                    }
                    saveCandidateToStorage(formData);
                    showSuccessModal();
                });
            } else {
                saveCandidateToStorage(formData);
                showSuccessModal();
            }
        });

        function saveCandidateToStorage(formData) {
            var candidatesData = [];
            try {
                var stored = localStorage.getItem('wohuCandidates');
                if (stored) {
                    candidatesData = JSON.parse(stored);
                }
            } catch (e) {
                candidatesData = [];
            }

            var newCandidate = {
                id: Date.now(),
                name: formData.name,
                school: formData.school,
                major: formData.major,
                email: formData.email,
                phone: formData.phone,
                status: 'pending',
                introduction: formData.introduction,
                submitTime: new Date().toLocaleString('zh-CN')
            };

            candidatesData.push(newCandidate);

            try {
                localStorage.setItem('wohuCandidates', JSON.stringify(candidatesData));
            } catch (e) {
                console.error('保存候选人数据失败:', e);
            }
        }

        function showSuccessModal() {
            addClass(modal, 'show');
            document.body.style.overflow = 'hidden';
        }

        modalClose.addEventListener('click', function() {
            removeClass(modal, 'show');
            document.body.style.overflow = 'auto';
            form.reset();
            if (typeof window.clearFile === 'function') {
                window.clearFile();
            }
        });

        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modalClose.click();
            }
        });
    }

    function initNavigation() {
        var navLinks = document.querySelectorAll('.nav a');
        var ctaButton = document.querySelector('.cta-button');

        for (var i = 0; i < navLinks.length; i++) {
            navLinks[i].addEventListener('click', function(e) {
                e.preventDefault();
                var targetId = this.getAttribute('href');
                if (targetId) {
                    var targetElement = document.querySelector(targetId);
                    if (targetElement) {
                        smoothScrollTo(targetElement, 80);
                    }
                }
            });
        }

        if (ctaButton) {
            ctaButton.addEventListener('click', function(e) {
                e.preventDefault();
                var applySection = document.getElementById('apply');
                if (applySection) {
                    smoothScrollTo(applySection, 80);
                }
            });
        }
    }

    function initScrollEffects() {
        var header = document.querySelector('.header');
        if (!header) return;

        var scrollHandler = function() {
            if (window.scrollY > 100) {
                header.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.1)';
            } else {
                header.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.05)';
            }
        };

        if (window.addEventListener) {
            window.addEventListener('scroll', scrollHandler, false);
        } else if (window.attachEvent) {
            window.attachEvent('onscroll', scrollHandler);
        }
    }

    function init() {
        initUploadArea();
        initForm();
        initNavigation();
        initScrollEffects();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();