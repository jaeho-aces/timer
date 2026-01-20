let timerInterval = null;
let currentTime = 0;
let initialTime = 0;
let isRunning = false;
let isWarning = false;

const timerInput = document.getElementById('timer-input');
const warningInput = document.getElementById('warning-input');
const timerDisplay = document.getElementById('timer-display');
const timerDisplayContainer = timerDisplay.closest('.timer-display');
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const resetBtn = document.getElementById('reset-btn');
const resetSettingsBtn = document.getElementById('reset-settings-btn');
const pipBtn = document.getElementById('pip-btn');
const pipVideo = document.getElementById('pip-video');
const pipCanvas = document.getElementById('pip-canvas');
const body = document.body;

// 색상 선택기 요소
const normalColor = document.getElementById('normal-color');
const warningColor = document.getElementById('warning-color');

let pipStream = null;
let pipContext = null;
let pipAnimationFrame = null;
let pipUpdateInterval = null;
let warningStartTime = null; // 경고 시작 시점 (CSS 애니메이션 동기화용)

// 시간을 초 단위로만 표시
function formatTime(seconds) {
    return seconds.toFixed(1);
}

// 타이머 업데이트
function updateTimer() {
    currentTime -= 0.1;
    const warningThreshold = parseFloat(warningInput.value) || 0;
    
    if (currentTime <= 0) {
        currentTime = 0;
        timerDisplay.textContent = formatTime(0);
        
        // 0초가 되면 지정한 시간으로 반복
        if (isRunning) {
            currentTime = initialTime;
            isWarning = false;
            warningStartTime = null;
            if (timerDisplayContainer) {
                timerDisplayContainer.classList.remove('warning');
            }
        } else {
            stopTimer();
        }
    } else {
        timerDisplay.textContent = formatTime(currentTime);
        
        // 지정한 시간 전에 경고 시작
        if (currentTime <= warningThreshold && !isWarning) {
            isWarning = true;
            warningStartTime = Date.now(); // 경고 시작 시점 기록 (CSS 애니메이션 동기화)
            if (timerDisplayContainer) {
                timerDisplayContainer.classList.add('warning');
            }
        } else if (currentTime > warningThreshold && isWarning) {
            isWarning = false;
            warningStartTime = null;
            if (timerDisplayContainer) {
                timerDisplayContainer.classList.remove('warning');
            }
        }
    }
    
    // PIP 모드가 활성화되어 있으면 Canvas도 업데이트 (강제로 프레임 갱신)
    if (document.pictureInPictureElement && pipContext) {
        // Canvas를 다시 그리도록 트리거 (requestAnimationFrame이 이미 실행 중이므로 자동 업데이트됨)
        // 추가로 Canvas를 명시적으로 업데이트하여 비디오 스트림이 변경을 감지하도록 함
    }
}

// 타이머 시작
function startTimer() {
    if (isRunning) return;
    
    const inputValue = parseFloat(timerInput.value);
    
    if (isNaN(inputValue) || inputValue <= 0) {
        console.log('유효한 시간을 입력해주세요.');
        return;
    }
    
    if (currentTime === 0) {
        currentTime = inputValue;
        initialTime = inputValue;
    }
    
    isRunning = true;
    startBtn.disabled = true;
    stopBtn.disabled = false;
    timerInput.disabled = true;
    warningInput.disabled = true;
    
    timerInterval = setInterval(updateTimer, 100);
}

// 타이머 정지
function stopTimer() {
    isRunning = false;
    startBtn.disabled = false;
    stopBtn.disabled = true;
    timerInput.disabled = true;
    warningInput.disabled = true;
    
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    
    // 정지 시에도 현재 시간에 따라 경고 상태 업데이트 (페이지 기준)
    const warningThreshold = parseFloat(warningInput.value) || 0;
    if (currentTime > 0 && currentTime <= warningThreshold) {
        if (!isWarning) {
            warningStartTime = Date.now(); // 경고 시작 시점 기록
        }
        isWarning = true;
        if (timerDisplayContainer) {
            timerDisplayContainer.classList.add('warning');
        }
    } else {
        isWarning = false;
        warningStartTime = null;
        if (timerDisplayContainer) {
            timerDisplayContainer.classList.remove('warning');
        }
    }
}

// 타이머 리셋 (타이머만 초기화)
function resetTimer() {
    stopTimer();
    currentTime = 0;
    initialTime = 0;
    timerDisplay.textContent = formatTime(0);
    timerInput.disabled = false;
    warningInput.disabled = false;
    isWarning = false;
    warningStartTime = null;
    if (timerDisplayContainer) {
        timerDisplayContainer.classList.remove('warning');
    }
}

// 설정 초기화 (시간, 경고 시간, 색상 초기화)
function resetSettings() {
    // 기본값으로 설정
    timerInput.value = '10.0';
    warningInput.value = '3.0';
    normalColor.value = '#667eea';
    warningColor.value = '#ff6b6b';
    
    // 색상 업데이트
    updateColors();
    
    // 로컬스토리지에서 삭제
    localStorage.removeItem('timer-time');
    localStorage.removeItem('timer-warning-time');
    localStorage.removeItem('timer-normal-color');
    localStorage.removeItem('timer-warning-color');
    
    // 타이머도 초기화
    resetTimer();
}

// 이벤트 리스너
startBtn.addEventListener('click', startTimer);
stopBtn.addEventListener('click', stopTimer);
resetBtn.addEventListener('click', resetTimer);
resetSettingsBtn.addEventListener('click', resetSettings);

// Enter 키로 시작
timerInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !isRunning) {
        startTimer();
    }
});

// PIP 모드 시작
async function startPIP() {
    try {
        // Canvas 설정 (PIP에 적합한 크기)
        pipCanvas.width = 400;
        pipCanvas.height = 200;
        
        if (!pipContext) {
            pipContext = pipCanvas.getContext('2d');
        }
        
        // 비디오 속성 설정 (먼저 설정)
        pipVideo.autoplay = true;
        pipVideo.muted = true;
        pipVideo.playsInline = true;
        
        // Canvas를 비디오 스트림으로 변환 (60fps로 높여서 부드럽게)
        pipStream = pipCanvas.captureStream(60);
        pipVideo.srcObject = pipStream;
        
        // Canvas에 타이머 디스플레이 그리기 함수
        function drawToCanvas() {
            if (!pipContext) return;
            
            // Canvas를 완전히 지우고 다시 그리기 (비디오 스트림이 변경을 감지하도록)
            pipContext.clearRect(0, 0, pipCanvas.width, pipCanvas.height);
            
            // 색상 가져오기 (자동 그라데이션 생성)
            const normalGradient = generateGradientColors(normalColor.value);
            const warningGradient = generateGradientColors(warningColor.value);
            const normalStart = normalGradient.start;
            const normalEnd = normalGradient.end;
            const warningStart = warningGradient.start;
            const warningEnd = warningGradient.end;
            
            // 경고 상태는 페이지의 isWarning 변수를 사용 (페이지와 동기화)
            
            // 경고 상태에 따른 배경색 (깜박임 효과 포함 - CSS 애니메이션과 동기화)
            let gradient;
            if (isWarning && warningStartTime !== null) {
                // CSS 애니메이션과 동기화: 경고 시작 시점부터 경과한 시간 기준
                // CSS 애니메이션은 0.5초 주기로 0-50%에서 경고 색상, 50-100%에서 기본 색상
                const elapsed = Date.now() - warningStartTime;
                const cycleTime = elapsed % 500; // 0.5초 주기
                const isBlinkOn = cycleTime < 250; // 0-250ms: 경고 색상, 250-500ms: 기본 색상
                
                if (isBlinkOn) {
                    // 경고 색상 (깜박임)
                    gradient = pipContext.createLinearGradient(0, 0, pipCanvas.width, pipCanvas.height);
                    gradient.addColorStop(0, warningStart);
                    gradient.addColorStop(1, warningEnd);
                } else {
                    // 기본 색상
                    gradient = pipContext.createLinearGradient(0, 0, pipCanvas.width, pipCanvas.height);
                    gradient.addColorStop(0, normalStart);
                    gradient.addColorStop(1, normalEnd);
                }
            } else {
                // 일반 상태 기본 색상 그라데이션
                gradient = pipContext.createLinearGradient(0, 0, pipCanvas.width, pipCanvas.height);
                gradient.addColorStop(0, normalStart);
                gradient.addColorStop(1, normalEnd);
            }
            
            pipContext.fillStyle = gradient;
            pipContext.fillRect(0, 0, pipCanvas.width, pipCanvas.height);
            
            // 텍스트 스타일 (동적 크기 조정)
            const fontSize = Math.min(pipCanvas.width / 5, 80);
            pipContext.fillStyle = 'white';
            pipContext.font = `bold ${fontSize}px 'Segoe UI', Arial, sans-serif`;
            pipContext.textAlign = 'center';
            pipContext.textBaseline = 'middle';
            pipContext.shadowColor = 'rgba(0, 0, 0, 0.3)';
            pipContext.shadowBlur = 6;
            pipContext.shadowOffsetX = 2;
            pipContext.shadowOffsetY = 2;
            
            // 타이머 텍스트 그리기 (currentTime을 직접 사용)
            const text = formatTime(Math.max(0, currentTime));
            pipContext.fillText(text, pipCanvas.width / 2, pipCanvas.height / 2);
        }
        
        // 초기 그리기
        drawToCanvas();
        
        // 비디오 메타데이터가 로드될 때까지 기다리기 (여러 이벤트 리스너)
        await new Promise((resolve) => {
            const checkReady = () => {
                if (pipVideo.readyState >= 2) { // HAVE_CURRENT_DATA 이상
                    resolve();
                }
            };
            
            // 이미 준비되어 있으면 즉시 resolve
            if (pipVideo.readyState >= 2) {
                resolve();
                return;
            }
            
            // 여러 이벤트를 듣고 하나라도 발생하면 resolve
            pipVideo.addEventListener('loadedmetadata', checkReady, { once: true });
            pipVideo.addEventListener('loadeddata', checkReady, { once: true });
            pipVideo.addEventListener('canplay', checkReady, { once: true });
            
            // 최대 2초 대기 후 강제 진행
            setTimeout(() => {
                resolve();
            }, 2000);
        });
        
        // 비디오 재생 (메타데이터 로드 후)
        try {
            await pipVideo.play();
            // 재생이 시작될 때까지 약간 대기
            await new Promise(resolve => setTimeout(resolve, 100));
        } catch (e) {
            console.log('비디오 재생 시도 실패 (계속 진행):', e);
        }
        
        // PIP 모드 시작 (재생 후)
        await pipVideo.requestPictureInPicture();
        
        // 타이머와 동기화하여 Canvas를 주기적으로 업데이트 (100ms마다 - 타이머 업데이트와 동일한 주기)
        pipUpdateInterval = setInterval(() => {
            if (document.pictureInPictureElement && pipContext) {
                drawToCanvas();
            }
        }, 100);
        
        pipBtn.textContent = 'PIP 종료';
        pipBtn.classList.add('pip-active');
        
        // PIP 창이 닫힐 때 처리
        pipVideo.addEventListener('leavepictureinpicture', () => {
            stopPIP();
        }, { once: true });
        
    } catch (error) {
        console.log('PIP 모드 오류:', error);
        console.log('PIP 모드를 지원하지 않는 브라우저이거나 권한이 필요합니다.');
    }
}

// PIP 모드 종료
function stopPIP() {
    if (pipAnimationFrame) {
        cancelAnimationFrame(pipAnimationFrame);
        pipAnimationFrame = null;
    }
    
    if (pipUpdateInterval) {
        clearInterval(pipUpdateInterval);
        pipUpdateInterval = null;
    }
    
    if (pipVideo.srcObject) {
        pipVideo.srcObject.getTracks().forEach(track => track.stop());
        pipVideo.srcObject = null;
    }
    
    if (document.pictureInPictureElement) {
        document.exitPictureInPicture();
    }
    
    pipBtn.textContent = 'PIP 모드';
    pipBtn.classList.remove('pip-active');
}

// PIP 버튼 클릭 이벤트
pipBtn.addEventListener('click', async () => {
    if (document.pictureInPictureElement) {
        stopPIP();
    } else {
        // PIP API 지원 확인
        if (!document.pictureInPictureEnabled || !pipVideo.requestPictureInPicture) {
            console.log('PIP 모드를 지원하지 않는 브라우저입니다.');
            return;
        }
        await startPIP();
    }
});

// 타이머 업데이트 시 Canvas도 업데이트되도록 (이미 drawToCanvas에서 처리됨)

// 색상에서 자동 그라데이션 생성 (밝은 색상과 어두운 색상)
function generateGradientColors(baseColor) {
    // RGB 값 추출
    const hex = baseColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // RGB를 HSL로 변환
    const rNorm = r / 255;
    const gNorm = g / 255;
    const bNorm = b / 255;
    
    const max = Math.max(rNorm, gNorm, bNorm);
    const min = Math.min(rNorm, gNorm, bNorm);
    let h, s, l = (max + min) / 2;
    
    if (max === min) {
        h = s = 0; // 무채색
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        
        if (max === rNorm) {
            h = ((gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0)) / 6;
        } else if (max === gNorm) {
            h = ((bNorm - rNorm) / d + 2) / 6;
        } else {
            h = ((rNorm - gNorm) / d + 4) / 6;
        }
    }
    
    // HSL에서 시작 색상 (밝게)과 끝 색상 (어둡게) 생성
    const startL = Math.min(1, l + 0.15); // 15% 더 밝게
    const endL = Math.max(0, l - 0.15);   // 15% 더 어둡게
    
    // HSL을 RGB로 변환하는 함수
    function hslToRgb(h, s, l) {
        let r, g, b;
        
        if (s === 0) {
            r = g = b = l; // 무채색
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        
        return [
            Math.round(r * 255),
            Math.round(g * 255),
            Math.round(b * 255)
        ];
    }
    
    const [rStart, gStart, bStart] = hslToRgb(h, s, startL);
    const [rEnd, gEnd, bEnd] = hslToRgb(h, s, endL);
    
    const startColor = `#${[rStart, gStart, bStart].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('')}`;
    
    const endColor = `#${[rEnd, gEnd, bEnd].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('')}`;
    
    return { start: startColor, end: endColor };
}

// 색상 업데이트 함수
function updateColors() {
    if (timerDisplayContainer) {
        const normalGradient = generateGradientColors(normalColor.value);
        const warningGradient = generateGradientColors(warningColor.value);
        
        timerDisplayContainer.style.setProperty('--normal-color-start', normalGradient.start);
        timerDisplayContainer.style.setProperty('--normal-color-end', normalGradient.end);
        timerDisplayContainer.style.setProperty('--warning-color-start', warningGradient.start);
        timerDisplayContainer.style.setProperty('--warning-color-end', warningGradient.end);
    }
}

// 로컬스토리지 저장 함수
function saveToLocalStorage() {
    localStorage.setItem('timer-time', timerInput.value);
    localStorage.setItem('timer-warning-time', warningInput.value);
    localStorage.setItem('timer-normal-color', normalColor.value);
    localStorage.setItem('timer-warning-color', warningColor.value);
}

// 로컬스토리지에서 불러오기 함수
function loadFromLocalStorage() {
    const savedTime = localStorage.getItem('timer-time');
    const savedWarningTime = localStorage.getItem('timer-warning-time');
    const savedNormalColor = localStorage.getItem('timer-normal-color');
    const savedWarningColor = localStorage.getItem('timer-warning-color');
    
    if (savedTime) {
        timerInput.value = savedTime;
    }
    
    if (savedWarningTime) {
        warningInput.value = savedWarningTime;
    }
    
    if (savedNormalColor) {
        normalColor.value = savedNormalColor;
    }
    
    if (savedWarningColor) {
        warningColor.value = savedWarningColor;
    }
}

// 값 변경 시 로컬스토리지에 저장
timerInput.addEventListener('input', saveToLocalStorage);
warningInput.addEventListener('input', saveToLocalStorage);
normalColor.addEventListener('input', () => {
    updateColors();
    saveToLocalStorage();
});
warningColor.addEventListener('input', () => {
    updateColors();
    saveToLocalStorage();
});

// 로컬스토리지에서 불러오기
loadFromLocalStorage();

// 초기 색상 설정
updateColors();

// 초기화
timerDisplay.textContent = formatTime(0);
