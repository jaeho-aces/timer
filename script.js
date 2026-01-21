let timerInterval = null;
let currentTime = 0;
let initialTime = 0;
let isRunning = false;
let isWarning = false;

const timerInput = document.getElementById('timer-input');
const warningInput = document.getElementById('warning-input');
const timerDisplay = document.getElementById('timer-display');
const timerCard = timerDisplay.closest('.timer-card');
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const resetBtn = document.getElementById('reset-btn');
const muteBtn = document.getElementById('mute-btn');
const resetSettingsBtn = document.getElementById('reset-settings-btn');
const pipBtn = document.getElementById('pip-btn');
const pipRoot = document.getElementById('pip-root');
const body = document.body;

// 사이드바 요소 제거됨

// 타이머 카드 버튼

// 고정 색상 값
const NORMAL_COLOR = '#2c2d32'; // 다크모드 색상
const WARNING_COLOR = '#ff6b6b'; // 빨간색

let pipWindow = null; // PIP 창
let warningStartTime = null; // 경고 시작 시점 (CSS 애니메이션 동기화용)
let audioContext = null; // 오디오 컨텍스트
let lastBeepTime = 0; // 마지막 비프음 재생 시점
let lastBeepCycle = -1; // 마지막 비프음 주기 번호 (500ms 단위)
let volumeLevel = 0.3; // 음량 레벨 (0~1, 기본값 0.3 = 30%)
let hasPlayedAlarm = false; // 띠링 알림음 재생 여부 (한 번만 재생하기 위한 플래그)

// 시간을 초 단위로만 표시
function formatTime(seconds) {
    return seconds.toFixed(1);
}

// 비프음 재생 함수
function playBeep() {
    if (volumeLevel <= 0) return; // 음량이 0이면 재생하지 않음
    
    try {
        // AudioContext 초기화 (사용자 인터랙션 후에만 가능)
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // 비프음 설정
        oscillator.frequency.value = 800; // 800Hz 주파수
        oscillator.type = 'sine'; // 사인파
        
        // 볼륨 설정 (volumeLevel 사용)
        gainNode.gain.setValueAtTime(volumeLevel, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        // 0.1초 동안 재생
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
    } catch (error) {
        console.log('비프음 재생 오류:', error);
    }
}

// 띠링 알림음 재생 함수 (시간 종료 시)
function playAlarm() {
    if (volumeLevel <= 0) return; // 음량이 0이면 재생하지 않음
    
    try {
        // AudioContext 초기화 (사용자 인터랙션 후에만 가능)
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        const currentTime = audioContext.currentTime;
        
        // 첫 번째 음 (높은 음)
        const oscillator1 = audioContext.createOscillator();
        const gainNode1 = audioContext.createGain();
        oscillator1.connect(gainNode1);
        gainNode1.connect(audioContext.destination);
        
        oscillator1.frequency.value = 1000; // 1000Hz
        oscillator1.type = 'sine';
        
        gainNode1.gain.setValueAtTime(0, currentTime);
        gainNode1.gain.linearRampToValueAtTime(volumeLevel, currentTime + 0.05);
        gainNode1.gain.setValueAtTime(volumeLevel, currentTime + 0.3);
        gainNode1.gain.linearRampToValueAtTime(0, currentTime + 0.35);
        
        oscillator1.start(currentTime);
        oscillator1.stop(currentTime + 0.35);
        
        // 두 번째 음 (더 높은 음)
        const oscillator2 = audioContext.createOscillator();
        const gainNode2 = audioContext.createGain();
        oscillator2.connect(gainNode2);
        gainNode2.connect(audioContext.destination);
        
        oscillator2.frequency.value = 1500; // 1500Hz
        oscillator2.type = 'sine';
        
        gainNode2.gain.setValueAtTime(0, currentTime + 0.3);
        gainNode2.gain.linearRampToValueAtTime(volumeLevel, currentTime + 0.35);
        gainNode2.gain.setValueAtTime(volumeLevel, currentTime + 0.6);
        gainNode2.gain.linearRampToValueAtTime(0, currentTime + 0.65);
        
        oscillator2.start(currentTime + 0.3);
        oscillator2.stop(currentTime + 0.65);
    } catch (error) {
        console.log('띠링 알림음 재생 오류:', error);
    }
}

// 음량 슬라이더 토글 함수
function toggleVolumeSlider(isPipWindow = false) {
    // 메인 페이지와 PIP 모드 각각 독립적으로 처리
    if (isPipWindow) {
        // PIP 모드
        if (!pipWindow || pipWindow.closed) return;
        const pipDocument = pipWindow.document;
        const pipVolumeSliderContainer = pipDocument.getElementById('volume-slider-container');
        if (pipVolumeSliderContainer) {
            const isVisible = pipVolumeSliderContainer.style.display !== 'none';
            pipVolumeSliderContainer.style.display = isVisible ? 'none' : 'block';
            
            if (!isVisible) {
                setTimeout(() => {
                    const clickHandler = (event) => {
                        handleOutsideClick(event, true);
                    };
                    pipDocument.addEventListener('click', clickHandler, true);
                }, 0);
            }
        }
    } else {
        // 메인 페이지
        const volumeSliderContainer = document.getElementById('volume-slider-container');
        if (volumeSliderContainer) {
            const isVisible = volumeSliderContainer.style.display !== 'none';
            volumeSliderContainer.style.display = isVisible ? 'none' : 'block';
            
            if (!isVisible) {
                setTimeout(() => {
                    const clickHandler = (event) => {
                        handleOutsideClick(event, false);
                    };
                    document.addEventListener('click', clickHandler, true);
                }, 0);
            }
        }
    }
}

// 외부 클릭 처리 함수
function handleOutsideClick(event, isPipWindow = false) {
    const targetDocument = isPipWindow ? pipWindow.document : document;
    if (!targetDocument) return;
    
    const volumeSliderContainer = targetDocument.getElementById('volume-slider-container');
    const volumeControlWrapper = targetDocument.querySelector('.volume-control-wrapper');
    
    if (volumeSliderContainer && volumeControlWrapper) {
        // 클릭이 음량 컨트롤 영역 밖이면 슬라이더 숨기기
        if (!volumeControlWrapper.contains(event.target)) {
            volumeSliderContainer.style.display = 'none';
            // 모든 외부 클릭 리스너 제거
            targetDocument.removeEventListener('click', handleOutsideClick, true);
        }
    }
}

// 음량 업데이트 함수
function updateVolume(value) {
    volumeLevel = value / 100; // 0~100을 0~1로 변환
    const volumeValue = document.getElementById('volume-value');
    if (volumeValue) {
        volumeValue.textContent = Math.round(value) + '%';
    }
    
    // 로컬스토리지에 저장
    localStorage.setItem('timer-volume', value.toString());
    
    // PIP 창이 열려있으면 동기화
    if (pipWindow && !pipWindow.closed) {
        const pipVolumeSlider = pipWindow.document.getElementById('volume-slider');
        const pipVolumeValue = pipWindow.document.getElementById('volume-value');
        if (pipVolumeSlider) {
            pipVolumeSlider.value = value;
        }
        if (pipVolumeValue) {
            pipVolumeValue.textContent = Math.round(value) + '%';
        }
    }
    
    // 메인 페이지도 동기화 (PIP에서 변경한 경우)
    const mainVolumeSlider = document.getElementById('volume-slider');
    const mainVolumeValue = document.getElementById('volume-value');
    if (mainVolumeSlider && mainVolumeSlider !== event?.target) {
        mainVolumeSlider.value = value;
    }
    if (mainVolumeValue) {
        mainVolumeValue.textContent = Math.round(value) + '%';
    }
}

// 타이머 업데이트
function updateTimer() {
    currentTime -= 0.1;
    const warningThreshold = parseFloat(warningInput.value) || 0;
    
    if (currentTime <= 0) {
        currentTime = 0;
        timerDisplay.textContent = formatTime(0);
        
        // 시간이 끝나면 띠링 알림음 재생 (한 번만)
        if (!hasPlayedAlarm) {
            playAlarm();
            hasPlayedAlarm = true;
        }
        
        // 0초가 되면 지정한 시간으로 반복
        if (isRunning) {
            currentTime = initialTime;
            isWarning = false;
            warningStartTime = null;
            hasPlayedAlarm = false; // 리셋할 때 알림음 플래그도 초기화
            if (timerDisplay) {
                timerDisplay.classList.remove('warning');
            }
        } else {
            stopTimer();
        }
    } else {
        timerDisplay.textContent = formatTime(currentTime);
        
        // 지정한 시간 전에 경고 시작 (기본색상과 경고색상 깜빡임)
        if (currentTime <= warningThreshold && !isWarning) {
            isWarning = true;
            warningStartTime = Date.now(); // 경고 시작 시점 기록 (비프음 동기화용)
            lastBeepTime = Date.now(); // 비프음 재생 시점 초기화 (절대 시간)
            lastBeepCycle = 0; // 첫 번째 주기 (0ms 시점)
            if (timerDisplay) {
                timerDisplay.classList.add('warning');
            }
            // 경고 시작 시 즉시 비프음 재생
            playBeep();
        } else if (currentTime > warningThreshold && isWarning) {
            isWarning = false;
            warningStartTime = null;
            lastBeepTime = 0;
            lastBeepCycle = -1;
            if (timerDisplay) {
                timerDisplay.classList.remove('warning');
            }
        } else if (isWarning && warningStartTime !== null) {
            // 경고 중일 때 0.5초마다 정확히 비프음 재생
            // warningStartTime을 기준으로 500ms 주기로 재생
            const now = Date.now();
            const elapsed = now - warningStartTime; // 경고 시작 후 경과 시간 (ms)
            const currentCycle = Math.floor(elapsed / 500); // 현재 주기 번호
            
            // 새로운 주기(500ms)에 도달했으면 비프음 재생
            if (currentCycle > lastBeepCycle) {
                playBeep();
                lastBeepCycle = currentCycle;
                lastBeepTime = now;
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
        hasPlayedAlarm = false; // 새로운 타이머 시작 시 알림음 플래그 초기화
    }
    
    isRunning = true;
    startBtn.style.display = 'none';
    stopBtn.style.display = 'flex';
    stopBtn.disabled = false;
    timerInput.disabled = true;
    warningInput.disabled = true;
    
    timerInterval = setInterval(updateTimer, 100);
}

// 타이머 정지
function stopTimer() {
    isRunning = false;
    startBtn.style.display = 'flex';
    stopBtn.style.display = 'none';
    timerInput.disabled = true;
    warningInput.disabled = true;
    
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    
    // 정지 시에도 현재 시간에 따라 경고 상태 업데이트 (배경색 변경 없이)
    const warningThreshold = parseFloat(warningInput.value) || 0;
    if (currentTime > 0 && currentTime <= warningThreshold) {
        if (!isWarning) {
            warningStartTime = Date.now(); // 경고 시작 시점 기록
            lastBeepTime = Date.now(); // 비프음 재생 시점 초기화 (절대 시간)
            lastBeepCycle = 0; // 첫 번째 주기
        }
        isWarning = true;
        if (timerDisplay) {
            timerDisplay.classList.add('warning');
        }
    } else {
        isWarning = false;
        warningStartTime = null;
        lastBeepTime = 0;
        lastBeepCycle = -1;
        if (timerDisplay) {
            timerDisplay.classList.remove('warning');
        }
    }
}

// 타이머 리셋 (설정한 시간으로 초기화)
function resetTimer() {
    const wasRunning = isRunning; // 재생 중이었는지 저장
    
    // 재생 중이 아니면 정지
    if (!wasRunning) {
        stopTimer();
    }
    
    // 입력된 시간으로 설정
    const inputValue = parseFloat(timerInput.value);
    if (!isNaN(inputValue) && inputValue > 0) {
        currentTime = inputValue;
        initialTime = inputValue;
        timerDisplay.textContent = formatTime(currentTime);
    } else {
        // 입력값이 유효하지 않으면 0으로 설정
        currentTime = 0;
        initialTime = 0;
        timerDisplay.textContent = formatTime(0);
    }
    
    // 경고 상태 초기화
    isWarning = false;
    warningStartTime = null;
    lastBeepTime = 0;
    lastBeepCycle = -1;
    hasPlayedAlarm = false; // 리셋 시 알림음 플래그도 초기화
    if (timerDisplay) {
        timerDisplay.classList.remove('warning');
    }
    
    // 정지 상태일 때만 입력 필드 활성화
    if (!wasRunning) {
        timerInput.disabled = false;
        warningInput.disabled = false;
    }
    
    // 재생 중이었으면 다시 시작
    if (wasRunning && currentTime > 0) {
        // 타이머는 계속 실행 중이므로 별도 처리 불필요
    } else if (wasRunning && currentTime <= 0) {
        // 시간이 0이면 정지
        stopTimer();
        timerInput.disabled = false;
        warningInput.disabled = false;
    }
    
    // PIP 창이 열려있으면 타이머 디스플레이 업데이트
    if (pipWindow && !pipWindow.closed) {
        const pipTimerDisplayEl = pipWindow.document.getElementById('timer-display');
        if (pipTimerDisplayEl) {
            pipTimerDisplayEl.textContent = formatTime(currentTime);
        }
        const pipTimerDisplayContainer = pipWindow.document.querySelector('.timer-display');
        if (pipTimerDisplayContainer) {
            pipTimerDisplayContainer.classList.remove('warning');
        }
    }
}

// 설정 초기화 (시간, 경고 시간 초기화)
function resetSettings() {
    // 기본값으로 설정
    timerInput.value = '31.4';
    warningInput.value = '3.0';
    
    // 색상 업데이트 (고정 색상)
    updateColors();
    
    // 로컬스토리지에서 삭제
    localStorage.removeItem('timer-time');
    localStorage.removeItem('timer-warning-time');
    
    // 타이머도 초기화
    resetTimer();
}

// 사이드바 관련 코드 제거됨

// 이벤트 리스너
startBtn.addEventListener('click', startTimer);
stopBtn.addEventListener('click', stopTimer);
resetBtn.addEventListener('click', resetTimer);
muteBtn.addEventListener('click', toggleVolumeSlider);
resetSettingsBtn.addEventListener('click', resetSettings);

// 음량 슬라이더 이벤트 리스너
const volumeSlider = document.getElementById('volume-slider');
if (volumeSlider) {
    volumeSlider.addEventListener('input', (e) => {
        updateVolume(parseFloat(e.target.value));
    });
}

// +/-5 버튼 제거됨

// Enter 키로 시작
timerInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !isRunning) {
        startTimer();
    }
});

// PIP 모드 시작 (documentPictureInPicture API 사용)
async function startFloatingRemote() {
    try {
        // documentPictureInPicture API 지원 확인
        if (!window.documentPictureInPicture) {
            console.log('PIP 모드를 지원하지 않는 브라우저입니다. Chrome 123 이상이 필요합니다.');
            return;
        }
        
        // 1. PIP 창 열기
        pipWindow = await window.documentPictureInPicture.requestWindow({
            width: 400,
            height: 600,
        });
        
        // 2. 현재 페이지의 스타일(CSS)을 PIP 창으로 복사
        [...document.styleSheets].forEach((styleSheet) => {
            try {
                const cssRules = [...styleSheet.cssRules].map((rule) => rule.cssText).join('');
                const style = document.createElement('style');
                style.textContent = cssRules;
                pipWindow.document.head.appendChild(style);
            } catch (e) {
                // 외부 스타일시트인 경우
                try {
                    const link = document.createElement('link');
                    link.rel = 'stylesheet';
                    link.href = styleSheet.href;
                    pipWindow.document.head.appendChild(link);
                } catch (e2) {
                    console.log('스타일 복사 실패:', e2);
                }
            }
        });
        
        // 3. PIP 창에 넣을 HTML 구조 만들기 (설정 패널과 사이드바 제외)
        const timerContainer = document.createElement('div');
        timerContainer.className = 'pip-root';
        
        // 타이머 그리드만 복사
        const timerGrid = pipRoot.querySelector('.timer-grid');
        
        // HTML 구조 재구성
        let pipHTML = '';
        
        // 메인 컨텐츠 영역 (타이머 그리드만)
        pipHTML += '<div class="main-content">';
        if (timerGrid) {
            pipHTML += timerGrid.outerHTML;
        }
        pipHTML += '</div>';
        
        timerContainer.innerHTML = pipHTML;
        pipWindow.document.body.appendChild(timerContainer);
        
        // PIP 창의 body 스타일 설정
        pipWindow.document.body.style.margin = '0';
        pipWindow.document.body.style.padding = '0';
        pipWindow.document.body.style.height = '100%';
        pipWindow.document.body.style.overflow = 'hidden';
        pipWindow.document.body.className = 'bg-cd-back h-full';
        
        // PIP 창의 main-content 스타일 조정 (사이드바가 없으므로 margin-left 제거)
        const pipMainContent = pipWindow.document.querySelector('.main-content');
        if (pipMainContent) {
            pipMainContent.style.marginLeft = '0';
            pipMainContent.style.width = '100%';
            pipMainContent.style.padding = '16px';
        }
        
        // 4. PIP 창 내부 버튼에 이벤트 연결
        const pipStartBtn = pipWindow.document.querySelector('#start-btn');
        const pipStopBtn = pipWindow.document.querySelector('#stop-btn');
        const pipResetBtn = pipWindow.document.querySelector('#reset-btn');
        const pipMuteBtn = pipWindow.document.querySelector('#mute-btn');
        
        if (pipStartBtn) {
            pipStartBtn.addEventListener('click', () => {
                startTimer();
            });
        }
        
        if (pipStopBtn) {
            pipStopBtn.addEventListener('click', () => {
                stopTimer();
            });
        }
        
        if (pipResetBtn) {
            pipResetBtn.addEventListener('click', () => {
                resetTimer();
            });
        }
        
        if (pipMuteBtn) {
            pipMuteBtn.addEventListener('click', () => {
                toggleVolumeSlider(true); // PIP 모드임을 표시
            });
        }
        
        // PIP 창 내부 음량 슬라이더 이벤트 연결
        const pipVolumeSlider = pipWindow.document.getElementById('volume-slider');
        if (pipVolumeSlider) {
            pipVolumeSlider.addEventListener('input', (e) => {
                updateVolume(parseFloat(e.target.value));
            });
        }
        
        // PIP 창 외부 클릭 리스너를 위한 함수
        const pipHandleOutsideClick = (event) => {
            handleOutsideClick(event, true);
        };
        
        // PIP 창이 닫힐 때 리스너 정리
        pipWindow.addEventListener('beforeunload', () => {
            if (pipWindow && pipWindow.document) {
                pipWindow.document.removeEventListener('click', pipHandleOutsideClick, true);
            }
        });
        
        // 5. 실시간 동기화 함수
        function syncPIPWindow() {
            if (!pipWindow || pipWindow.closed) return;
            
            try {
                const pipTimerDisplay = pipWindow.document.getElementById('timer-display');
                const pipTimerDisplayContainer = pipTimerDisplay?.closest('.timer-display');
                const pipStartBtn = pipWindow.document.getElementById('start-btn');
                const pipStopBtn = pipWindow.document.getElementById('stop-btn');
                
                // 타이머 표시 업데이트
                if (pipTimerDisplay) {
                    pipTimerDisplay.textContent = formatTime(Math.max(0, currentTime));
                }
                
                // 경고 상태 업데이트 (기본색상과 경고색상 깜빡임)
                if (pipTimerDisplayContainer) {
                    if (isWarning) {
                        pipTimerDisplayContainer.classList.add('warning');
                    } else {
                        pipTimerDisplayContainer.classList.remove('warning');
                    }
                }
                
                // 버튼 상태 업데이트
                if (pipStartBtn && pipStopBtn) {
                    if (isRunning) {
                        pipStartBtn.style.display = 'none';
                        pipStopBtn.style.display = 'flex';
                        pipStopBtn.disabled = false;
                    } else {
                        pipStartBtn.style.display = 'flex';
                        pipStopBtn.style.display = 'none';
                    }
                }
                
                // 음량 슬라이더 상태 업데이트
                const pipVolumeSlider = pipWindow.document.getElementById('volume-slider');
                const pipVolumeValue = pipWindow.document.getElementById('volume-value');
                if (pipVolumeSlider) {
                    pipVolumeSlider.value = Math.round(volumeLevel * 100);
                }
                if (pipVolumeValue) {
                    pipVolumeValue.textContent = Math.round(volumeLevel * 100) + '%';
                }
                
                // 메인 페이지 음량 슬라이더 상태도 동기화
                const mainVolumeSlider = document.getElementById('volume-slider');
                const mainVolumeValue = document.getElementById('volume-value');
                if (mainVolumeSlider) {
                    mainVolumeSlider.value = Math.round(volumeLevel * 100);
                }
                if (mainVolumeValue) {
                    mainVolumeValue.textContent = Math.round(volumeLevel * 100) + '%';
                }
                
                // 색상 업데이트 (고정 색상 사용)
                if (pipTimerDisplayContainer) {
                    const normalGradient = generateGradientColors(NORMAL_COLOR);
                    const warningGradient = generateGradientColors(WARNING_COLOR);
                    pipTimerDisplayContainer.style.setProperty('--normal-color-start', normalGradient.start);
                    pipTimerDisplayContainer.style.setProperty('--normal-color-end', normalGradient.end);
                    pipTimerDisplayContainer.style.setProperty('--warning-color-start', warningGradient.start);
                    pipTimerDisplayContainer.style.setProperty('--warning-color-end', warningGradient.end);
                }
            } catch (e) {
                console.error('동기화 오류:', e);
            }
        }
        
        // 주기적으로 동기화 (100ms마다)
        const syncInterval = setInterval(() => {
            if (!pipWindow || pipWindow.closed) {
                clearInterval(syncInterval);
                return;
            }
            syncPIPWindow();
        }, 100);
        
        // PIP 창이 닫힐 때 처리
        pipWindow.addEventListener('pagehide', () => {
            clearInterval(syncInterval);
            pipWindow = null;
            pipBtn.textContent = 'PIP 모드';
            pipBtn.classList.remove('pip-active');
        });
        
        // 초기 동기화
        syncPIPWindow();
        
        pipBtn.textContent = 'PIP 종료';
        pipBtn.classList.add('pip-active');
        
    } catch (error) {
        console.log('PIP 모드 오류:', error);
        console.log('PIP 모드를 지원하지 않는 브라우저이거나 권한이 필요합니다.');
    }
}

// PIP 모드 종료
function stopFloatingRemote() {
    if (pipWindow && !pipWindow.closed) {
        pipWindow.close();
    }
    pipWindow = null;
    
    pipBtn.textContent = 'PIP 모드';
    pipBtn.classList.remove('pip-active');
}

// 사용하지 않는 함수 제거됨 - 새 창 방식으로 변경
/*
function handlePIPFloatingClick(event) {
    if (!document.pictureInPictureElement) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    const video = event.target;
    if (!video || video !== pipVideo) return;
    
    // PIP 창의 비디오 요소에서 클릭 위치 가져오기
    let x, y;
    if (event.clientX !== undefined && event.clientY !== undefined) {
        const rect = video.getBoundingClientRect();
        x = event.clientX - rect.left;
        y = event.clientY - rect.top;
    } else if (event.offsetX !== undefined && event.offsetY !== undefined) {
        x = event.offsetX;
        y = event.offsetY;
    } else {
        return;
    }
    
    // Canvas 크기에 맞춰 좌표 변환
    const scaleX = pipCanvas.width / video.videoWidth || pipCanvas.width / video.clientWidth;
    const scaleY = pipCanvas.height / video.videoHeight || pipCanvas.height / video.clientHeight;
    const canvasX = x * scaleX;
    const canvasY = y * scaleY;
    
    // 스케일 적용된 좌표로 변환
    const scaledX = canvasX / pipScale;
    const scaledY = canvasY / pipScale;
    
    // 사이드바 컨트롤 클릭 확인
    if (sidebarOpen && scaledX >= 0 && scaledX <= 64) {
        const buttonY = 40;
        const buttonSize = 32;
        const buttonSpacing = 8;
        const centerX = 32;
        
        // 시작 버튼
        if (Math.sqrt(Math.pow(scaledX - centerX, 2) + Math.pow(scaledY - buttonY, 2)) <= buttonSize / 2) {
            if (!isRunning) {
                startTimer();
            }
            return;
        }
        
        // 정지 버튼
        if (Math.sqrt(Math.pow(scaledX - centerX, 2) + Math.pow(scaledY - (buttonY + buttonSize + buttonSpacing), 2)) <= buttonSize / 2) {
            if (isRunning) {
                stopTimer();
            }
            return;
        }
        
        // 리셋 버튼
        if (Math.sqrt(Math.pow(scaledX - centerX, 2) + Math.pow(scaledY - (buttonY + (buttonSize + buttonSpacing) * 2), 2)) <= buttonSize / 2) {
            resetTimer();
            return;
        }
    }
    
    // 타이머 카드 버튼 클릭 확인
    const mainContentX = sidebarOpen ? 64 : 24;
    const cardX = mainContentX;
    const cardY = 232; // settingsPanelY + settingsPanelHeight + 16
    const cardWidth = 144;
    const displayY = cardY + 50;
    const displayHeight = 80;
    const buttonY = displayY + displayHeight + 8;
    const buttonHeight = 24;
    const buttonWidth = 24;
    const buttonSpacing = 4;
    const cardCenterX = cardX + cardWidth / 2;
    const totalWidth = buttonWidth * 5 + buttonSpacing * 4;
    const startX = cardCenterX - totalWidth / 2;
    
    if (scaledX >= cardX && scaledX <= cardX + cardWidth && scaledY >= cardY && scaledY <= cardY + 200) {
        // 버튼 영역 클릭 확인
        if (scaledY >= buttonY && scaledY <= buttonY + buttonHeight) {
            const buttonRadius = buttonWidth / 2;
            
            // -5 버튼
            const minusX = startX + buttonWidth / 2;
            const minusY = buttonY + buttonHeight / 2;
            if (Math.sqrt(Math.pow(scaledX - minusX, 2) + Math.pow(scaledY - minusY, 2)) <= buttonRadius) {
                if (!isRunning && currentTime > 0) {
                    currentTime = Math.max(0, currentTime - 5);
                    timerDisplay.textContent = formatTime(currentTime);
                }
                return;
            }
            
            // 시작/정지 버튼
            const playPauseX = startX + buttonWidth + buttonSpacing + buttonWidth / 2;
            const playPauseY = buttonY + buttonHeight / 2;
            if (Math.sqrt(Math.pow(scaledX - playPauseX, 2) + Math.pow(scaledY - playPauseY, 2)) <= 16) {
                if (isRunning) {
                    stopTimer();
                } else {
                    startTimer();
                }
                return;
            }
            
            // 리셋 버튼
            const resetX = startX + (buttonWidth + buttonSpacing) * 2 + buttonWidth / 2;
            const resetY = buttonY + buttonHeight / 2;
            if (Math.sqrt(Math.pow(scaledX - resetX, 2) + Math.pow(scaledY - resetY, 2)) <= 14) {
                resetTimer();
                return;
            }
            
            // +5 버튼
            const plusX = startX + (buttonWidth + buttonSpacing) * 3 + buttonWidth / 2;
            const plusY = buttonY + buttonHeight / 2;
            if (Math.sqrt(Math.pow(scaledX - plusX, 2) + Math.pow(scaledY - plusY, 2)) <= buttonRadius) {
                if (!isRunning) {
                    currentTime += 5;
                    timerDisplay.textContent = formatTime(currentTime);
                }
                return;
            }
        }
    }
}
*/

// 사용하지 않는 함수 제거됨
/*
async function startPIP() {
    try {
        // Canvas 설정 (PIP에 적합한 크기, 버튼 영역 포함)
        pipCanvas.width = 400;
        pipCanvas.height = 250; // 버튼 영역을 위해 높이 증가
        
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
            
            // 색상 가져오기 (고정 색상 사용)
            const normalGradient = generateGradientColors(NORMAL_COLOR);
            const warningGradient = generateGradientColors(WARNING_COLOR);
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
            const textY = 100; // 타이머 텍스트 Y 위치
            pipContext.fillText(text, pipCanvas.width / 2, textY);
            
            // 버튼 영역 그리기 (하단)
            const buttonAreaY = 160;
            const buttonHeight = 30;
            const buttonWidth = 80;
            const buttonSpacing = 10;
            const totalButtonWidth = buttonWidth * 3 + buttonSpacing * 2;
            const startX = (pipCanvas.width - totalButtonWidth) / 2;
            
            // 시작 버튼
            pipContext.fillStyle = isRunning ? '#666' : '#333';
            pipContext.fillRect(startX, buttonAreaY, buttonWidth, buttonHeight);
            pipContext.fillStyle = 'white';
            pipContext.font = 'bold 14px Arial';
            pipContext.textAlign = 'center';
            pipContext.fillText('시작', startX + buttonWidth / 2, buttonAreaY + 20);
            
            // 정지 버튼
            pipContext.fillStyle = isRunning ? '#333' : '#666';
            pipContext.fillRect(startX + buttonWidth + buttonSpacing, buttonAreaY, buttonWidth, buttonHeight);
            pipContext.fillStyle = 'white';
            pipContext.fillText('정지', startX + buttonWidth + buttonSpacing + buttonWidth / 2, buttonAreaY + 20);
            
            // 리셋 버튼
            pipContext.fillStyle = '#333';
            pipContext.fillRect(startX + (buttonWidth + buttonSpacing) * 2, buttonAreaY, buttonWidth, buttonHeight);
            pipContext.fillStyle = 'white';
            pipContext.fillText('리셋', startX + (buttonWidth + buttonSpacing) * 2 + buttonWidth / 2, buttonAreaY + 20);
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
        
        // PIP 비디오 요소에 클릭 이벤트 처리 (PIP 창에서 클릭 가능하도록)
        pipVideo.addEventListener('click', handlePIPVideoClick);
        
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

// 사용하지 않는 함수 제거됨
*/

// PIP 버튼 클릭 이벤트
pipBtn.addEventListener('click', async () => {
    if (pipWindow && !pipWindow.closed) {
        stopFloatingRemote();
    } else {
        await startFloatingRemote();
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

// 색상 업데이트 함수 (고정 색상 사용)
function updateColors() {
    const timerDisplayContainer = timerDisplay?.closest('.timer-display');
    if (timerDisplayContainer) {
        const normalGradient = generateGradientColors(NORMAL_COLOR);
        const warningGradient = generateGradientColors(WARNING_COLOR);
        
        // 고정 색상 적용
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
}

// 로컬스토리지에서 불러오기 함수
function loadFromLocalStorage() {
    const savedTime = localStorage.getItem('timer-time');
    const savedWarningTime = localStorage.getItem('timer-warning-time');
    const savedVolume = localStorage.getItem('timer-volume');
    
    if (savedTime) {
        timerInput.value = savedTime;
    }
    
    if (savedWarningTime) {
        warningInput.value = savedWarningTime;
    }
    
    if (savedVolume) {
        const volume = parseFloat(savedVolume);
        volumeLevel = volume / 100;
        const volumeSliderEl = document.getElementById('volume-slider');
        if (volumeSliderEl) {
            volumeSliderEl.value = volume;
        }
        const volumeValue = document.getElementById('volume-value');
        if (volumeValue) {
            volumeValue.textContent = Math.round(volume) + '%';
        }
    }
}

// 시간 입력 시 타이머에 바로 적용
timerInput.addEventListener('input', (e) => {
    saveToLocalStorage();
    
    // 재생 중이 아니면 타이머에 바로 반영
    if (!isRunning) {
        const inputValue = parseFloat(e.target.value);
        if (!isNaN(inputValue) && inputValue >= 0) {
            currentTime = inputValue;
            initialTime = inputValue;
            timerDisplay.textContent = formatTime(currentTime);
            
            // 경고 상태 업데이트
            const warningThreshold = parseFloat(warningInput.value) || 0;
            if (currentTime <= warningThreshold && currentTime > 0) {
                isWarning = true;
                warningStartTime = Date.now();
                lastBeepTime = 0;
                if (timerDisplay) {
                    timerDisplay.classList.add('warning');
                }
            } else {
                isWarning = false;
                warningStartTime = null;
                lastBeepTime = 0;
                if (timerDisplay) {
                    timerDisplay.classList.remove('warning');
                }
            }
            
            // PIP 창이 열려있으면 동기화
            if (pipWindow && !pipWindow.closed) {
                const pipTimerDisplayEl = pipWindow.document.getElementById('timer-display');
                if (pipTimerDisplayEl) {
                    pipTimerDisplayEl.textContent = formatTime(currentTime);
                }
                const pipTimerDisplayContainer = pipWindow.document.querySelector('.timer-display');
                if (pipTimerDisplayContainer) {
                    if (isWarning) {
                        pipTimerDisplayContainer.classList.add('warning');
                    } else {
                        pipTimerDisplayContainer.classList.remove('warning');
                    }
                }
            }
        }
    }
});

// 경고 시간 입력 시 로컬스토리지에 저장
warningInput.addEventListener('input', (e) => {
    saveToLocalStorage();
    
    // 재생 중이 아니면 경고 상태 업데이트
    if (!isRunning) {
        const warningThreshold = parseFloat(e.target.value) || 0;
        if (currentTime <= warningThreshold && currentTime > 0) {
            isWarning = true;
            warningStartTime = Date.now();
            lastBeepTime = 0;
            if (timerDisplay) {
                timerDisplay.classList.add('warning');
            }
        } else {
            isWarning = false;
            warningStartTime = null;
            lastBeepTime = 0;
            if (timerDisplay) {
                timerDisplay.classList.remove('warning');
            }
        }
        
        // PIP 창이 열려있으면 동기화
        if (pipWindow && !pipWindow.closed) {
            const pipTimerDisplayContainer = pipWindow.document.querySelector('.timer-display');
            if (pipTimerDisplayContainer) {
                if (isWarning) {
                    pipTimerDisplayContainer.classList.add('warning');
                } else {
                    pipTimerDisplayContainer.classList.remove('warning');
                }
            }
        }
    }
});

// 로컬스토리지에서 불러오기
loadFromLocalStorage();

// 초기 색상 설정
updateColors();

// 초기화 - 입력된 시간이 있으면 표시
const initialInputValue = parseFloat(timerInput.value);
if (!isNaN(initialInputValue) && initialInputValue >= 0) {
    currentTime = initialInputValue;
    initialTime = initialInputValue;
    timerDisplay.textContent = formatTime(currentTime);
    
    // 경고 상태 확인
    const warningThreshold = parseFloat(warningInput.value) || 0;
    if (currentTime <= warningThreshold && currentTime > 0) {
        isWarning = true;
        warningStartTime = Date.now();
        lastBeepTime = 0;
        if (timerDisplay) {
            timerDisplay.classList.add('warning');
        }
    }
} else {
    timerDisplay.textContent = formatTime(0);
}
