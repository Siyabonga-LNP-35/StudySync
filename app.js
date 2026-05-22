/**
 * StudySync Application Core Controller
 * Handles routing, interactive state (tasks, calendar, groups, chat), 
 * and accessibility layers (TTS, themes, key listeners).
 */

document.addEventListener('DOMContentLoaded', () => {
    // ==========================================================================
    // STATE MANAGEMENT
    // ==========================================================================
    const state = {
        tasks: [
            { id: 1, title: 'Study Java Chapter 5', desc: 'Object Oriented Programming • 2 hours', badge: 'HIGH', checked: false },
            { id: 2, title: 'Finish Business Analysis assignment', desc: 'Module BA404 • Draft stage', badge: 'DUE TOMORROW', checked: false }
        ],
        events: [
            { id: 1, title: 'Java Programming', location: 'Lab Room 402', day: 'Mon', start: '14:00', end: '15:30', type: 'class-blue' },
            { id: 2, title: 'BMNG 201', location: 'Lecture room 202', day: 'Tue', start: '15:00', end: '16:30', type: 'class-blue' },
            { id: 3, title: 'Self-Study', location: 'Library Floor 2', day: 'Thu', start: '17:00', end: '18:00', type: 'study-green' },
            { id: 4, title: 'Final Exam: Discrete Math', location: 'Exam Room 1B', day: 'Fri', start: '17:00', end: '19:00', type: 'exam-red' }
        ],
        groups: [
            { id: 'java', title: 'Java Programming Study Group', desc: 'Mastering Spring Boot, Hibernate, and modern Java design patterns through weekly coding challenges.', type: 'ACTIVE', members: 15, joined: false, initialBg: 'var(--color-primary-light)', initialColor: 'var(--color-primary)' },
            { id: 'ba', title: 'Business Analysis Group', desc: 'Collaborative study for the CCBA certification. Focusing on data modeling and requirements analysis.', type: 'PUBLIC', members: 10, joined: false, initialBg: 'var(--color-warning-light)', initialColor: 'var(--color-warning)' }
        ],
        chatMessages: {
            'java': [
                { sender: 'Thabo', text: "Does anyone understand recursion? I'm struggling with the base case logic in our last assignment.", time: '10:42 AM', self: false },
                { sender: 'Siyabonga (You)', text: "Yes, I can explain in the next session. It's essentially just a way to solve a problem by breaking it down into smaller sub-problems of the same type!", time: '10:45 AM', self: true }
            ],
            'ba': [
                { sender: 'Alice', text: "Hey group, when are we reviewing Chapter 4 of the BABOK guide?", time: 'Yesterday', self: false },
                { sender: 'Siyabonga (You)', text: "I'm free on Wednesday afternoon!", time: 'Yesterday', self: true }
            ]
        },
        activeGroupChat: null,
        stats: {
            studyTime: 24.5,
            completedTasks: 12,
            streak: 8
        },
        accessibility: {
            theme: 'normal',
            fontSize: 'medium', // small, medium, large, xlarge
            lineSpacing: 'normal',
            dyslexicFont: false,
            ttsEnabled: false,
            reducedMotion: false
        }
    };

    // DOM Cache
    const views = {
        dashboard: document.getElementById('dashboard-view'),
        calendar: document.getElementById('calendar-view'),
        groups: document.getElementById('groups-view'),
        settings: document.getElementById('settings-view'),
        addSession: document.getElementById('add-session-view')
    };

    const navButtons = document.querySelectorAll('.nav-btn');
    const srAnnouncer = document.getElementById('sr-announcer');
    const srMonitorBox = document.getElementById('sr-monitor-box');

    // ==========================================================================
    // DYNAMIC SCREEN READER FEEDBACK (Accessibility Simulation Log)
    // ==========================================================================
    function announceToScreenReader(text) {
        if (!srAnnouncer) return;
        
        // Update browser native screen reader node
        srAnnouncer.textContent = '';
        setTimeout(() => {
            srAnnouncer.textContent = text;
        }, 50);

        // Update visual developer monitor box
        if (srMonitorBox) {
            const now = new Date();
            const timestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            
            const logEntry = document.createElement('div');
            logEntry.className = 'monitor-log-item';
            logEntry.innerHTML = `
                <span class="monitor-timestamp">${timestamp}</span>
                <span class="monitor-text">${text}</span>
            `;
            
            srMonitorBox.appendChild(logEntry);
            srMonitorBox.scrollTop = srMonitorBox.scrollHeight;
        }

        // Native Text-To-Speech integration if enabled
        if (state.accessibility.ttsEnabled) {
            speakText(text);
        }
    }

    // Speech Synthesis helper
    function speakText(text) {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel(); // Stop current speech
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 1.0;
            window.speechSynthesis.speak(utterance);
        }
    }

    // TTS Hover reader setup
    function setupTtsHoverListeners() {
        // Listen to hover/focus on readable elements globally
        const readableElements = 'p, h1, h2, h3, h4, span, button, a, label, li, td, th, kbd, input[placeholder], textarea';
        
        document.body.addEventListener('mouseover', (e) => {
            if (!state.accessibility.ttsEnabled) return;
            const target = e.target.closest(readableElements);
            if (target && !target.dataset.ttsHovered) {
                // Avoid recursive loops
                target.dataset.ttsHovered = 'true';
                
                let textToRead = target.getAttribute('aria-label') || target.innerText || target.placeholder || '';
                if (textToRead.trim()) {
                    speakText(textToRead);
                }
                
                target.addEventListener('mouseleave', () => {
                    delete target.dataset.ttsHovered;
                }, { once: true });
            }
        });

        document.body.addEventListener('focusin', (e) => {
            if (!state.accessibility.ttsEnabled) return;
            const target = e.target.closest(readableElements);
            if (target) {
                let textToRead = target.getAttribute('aria-label') || target.innerText || target.placeholder || '';
                if (textToRead.trim()) {
                    speakText(textToRead);
                }
            }
        });
    }

    // ==========================================================================
    // ROUTING / VIEW CONTROLLER
    // ==========================================================================
    function switchView(viewName) {
        // Toggle view container visibilities
        Object.keys(views).forEach(key => {
            if (key === viewName) {
                views[key].classList.add('active');
            } else {
                views[key].classList.remove('active');
            }
        });

        // Update navigation sidebar button states
        navButtons.forEach(btn => {
            if (btn.dataset.target === viewName) {
                btn.classList.add('active');
                btn.setAttribute('aria-current', 'page');
            } else {
                btn.classList.remove('active');
                btn.removeAttribute('aria-current');
            }
        });

        // Custom announcements for page loads
        const viewTitles = {
            dashboard: "Dashboard page loaded. You have 2 tasks pending and 1 upcoming deadline.",
            calendar: "Study Calendar page loaded. Drag or click calendar blocks to reschedule.",
            groups: "Study Groups page loaded. Showing 2 recommended workspaces.",
            settings: "Accessibility settings page loaded. Configure themes, typography and text-to-speech toggles.",
            addSession: "Add Study Session form loaded."
        };

        announceToScreenReader(viewTitles[viewName] || `Navigated to ${viewName}`);
    }

    // Navbar clicks
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            switchView(btn.dataset.target);
        });
    });

    // Header buttons & CTA linking
    document.getElementById('header-add-session-btn').addEventListener('click', () => switchView('addSession'));
    document.getElementById('cancel-session-btn').addEventListener('click', () => switchView('calendar'));
    document.getElementById('see-all-groups-dashboard').addEventListener('click', () => switchView('groups'));

    const viewAllDeadlinesLink = document.getElementById('view-all-deadlines');
    if (viewAllDeadlinesLink) {
        viewAllDeadlinesLink.addEventListener('click', (e) => {
            e.preventDefault();
            switchView('calendar');
        });
    }

    // ==========================================================================
    // KEYBOARD NAVIGATION (Hotkeys)
    // ==========================================================================
    window.addEventListener('keydown', (e) => {
        // Alt + Key combinations
        if (e.altKey) {
            let handled = true;
            const key = e.key.toLowerCase();

            switch (key) {
                case 'd':
                    switchView('dashboard');
                    break;
                case 'c':
                    switchView('calendar');
                    break;
                case 'g':
                    switchView('groups');
                    break;
                case 's':
                    switchView('settings');
                    break;
                case 'a':
                    switchView('addSession');
                    break;
                default:
                    handled = false;
            }

            if (handled) {
                e.preventDefault();
            }
        }
    });

    // ==========================================================================
    // TASKS CHECKLIST (Dashboard)
    // ==========================================================================
    const tasksContainer = document.getElementById('tasks-container');
    const dashboardAddTaskBtn = document.getElementById('dashboard-add-task-btn');
    const addTaskModal = document.getElementById('add-task-modal');
    const closeTaskModalBtn = document.getElementById('close-task-modal-btn');
    const cancelTaskModalBtn = document.getElementById('cancel-task-modal-btn');
    const addTaskForm = document.getElementById('add-task-form');

    function renderTasks() {
        if (!tasksContainer) return;
        tasksContainer.innerHTML = '';

        state.tasks.forEach(task => {
            const taskEl = document.createElement('div');
            taskEl.className = 'task-item';
            
            let badgeClass = 'badge-normal';
            if (task.badge === 'HIGH') badgeClass = 'badge-high';
            if (task.badge === 'DUE TOMORROW') badgeClass = 'badge-tomorrow';

            taskEl.innerHTML = `
                <input type="checkbox" id="task-chk-${task.id}" class="task-checkbox" ${task.checked ? 'checked' : ''} aria-label="Mark task '${task.title}' as completed">
                <div class="task-details">
                    <label for="task-chk-${task.id}" class="task-title">${task.title}</label>
                    <span class="task-desc">${task.desc}</span>
                </div>
                <span class="task-badge ${badgeClass}">${task.badge}</span>
            `;

            // Toggle logic
            const chk = taskEl.querySelector('.task-checkbox');
            chk.addEventListener('change', (e) => {
                task.checked = e.target.checked;
                updateStatsAndGoal();
                
                const status = task.checked ? 'completed' : 'uncompleted';
                announceToScreenReader(`Task "${task.title}" marked as ${status}.`);
            });

            tasksContainer.appendChild(taskEl);
        });
    }

    function updateStatsAndGoal() {
        // Calculate goal percentage
        const total = state.tasks.length;
        const completed = state.tasks.filter(t => t.checked).length;
        
        // Base starting completed value is 12 (as seen in screenshots), increment based on current tasks checked
        const computedCompleted = state.stats.completedTasks + completed;
        document.getElementById('stats-tasks-completed').textContent = computedCompleted;

        // Base progress is 80%. Let's scale progress: if all tasks are complete, progress goes to 100%
        const bonusProgress = total > 0 ? (completed / total) * 20 : 0;
        const finalProgress = Math.round(80 + bonusProgress);

        const goalProgressText = document.getElementById('goal-progress-text');
        const goalProgressbar = document.getElementById('goal-progressbar');
        
        if (goalProgressText && goalProgressbar) {
            goalProgressText.textContent = `${finalProgress}%`;
            goalProgressbar.querySelector('.goal-bar-fill').style.width = `${finalProgress}%`;
            goalProgressbar.setAttribute('aria-valuenow', finalProgress);
        }
    }

    // Modal Events
    dashboardAddTaskBtn.addEventListener('click', () => {
        addTaskModal.classList.remove('hidden');
        document.getElementById('task-title-input').focus();
        announceToScreenReader("Add Task dialog opened.");
    });

    const hideTaskModal = () => {
        addTaskModal.classList.add('hidden');
        dashboardAddTaskBtn.focus();
    };

    closeTaskModalBtn.addEventListener('click', hideTaskModal);
    cancelTaskModalBtn.addEventListener('click', hideTaskModal);

    addTaskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = document.getElementById('task-title-input').value;
        const desc = document.getElementById('task-desc-input').value;
        const priority = document.getElementById('task-priority').value;

        const newId = state.tasks.length ? Math.max(...state.tasks.map(t => t.id)) + 1 : 1;
        state.tasks.push({
            id: newId,
            title,
            desc,
            badge: priority,
            checked: false
        });

        renderTasks();
        updateStatsAndGoal();
        hideTaskModal();
        addTaskForm.reset();
        announceToScreenReader(`Task "${title}" created successfully.`);
    });

    // ==========================================================================
    // STUDY CALENDAR RENDERING
    // ==========================================================================
    const calendarGrid = document.getElementById('calendar-grid');

    const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const timeSlots = [
        { label: '12:00 PM', start: '12:00', end: '13:00' },
        { label: '01:00 PM', start: '13:00', end: '14:00' },
        { label: '02:00 PM', start: '14:00', end: '15:00' },
        { label: '03:00 PM', start: '15:00', end: '16:00' },
        { label: '04:00 PM', start: '16:00', end: '17:00' },
        { label: '05:00 PM', start: '17:00', end: '18:00' },
        { label: '06:00 PM', start: '18:00', end: '19:00' }
    ];

    function renderCalendar() {
        if (!calendarGrid) return;
        calendarGrid.innerHTML = '';

        timeSlots.forEach(slot => {
            const row = document.createElement('div');
            row.className = 'calendar-grid-row';

            // Time Label Cell
            const timeCell = document.createElement('div');
            timeCell.className = 'grid-time-cell';
            timeCell.textContent = slot.label;
            row.appendChild(timeCell);

            // Day Cells
            daysOfWeek.forEach(day => {
                const cell = document.createElement('div');
                cell.className = 'grid-day-cell';
                cell.dataset.day = day;
                cell.dataset.time = slot.start;
                cell.setAttribute('role', 'button');
                cell.setAttribute('aria-label', `Schedule session on ${day} at ${slot.label}`);

                // Check if there is an event matching this day and time hour
                const matchEvent = state.events.find(ev => {
                    const evHour = parseInt(ev.start.split(':')[0]);
                    const slotHour = parseInt(slot.start.split(':')[0]);
                    return ev.day === day && evHour === slotHour;
                });

                if (matchEvent) {
                    const evEl = document.createElement('div');
                    evEl.className = `calendar-event ${matchEvent.type}`;
                    evEl.innerHTML = `
                        <span class="event-title">${matchEvent.title}</span>
                        <span class="event-meta">${matchEvent.location || ''}</span>
                        <span class="event-meta">${matchEvent.start} - ${matchEvent.end}</span>
                    `;
                    evEl.setAttribute('tabindex', '0');
                    evEl.setAttribute('role', 'article');
                    evEl.setAttribute('aria-label', `${matchEvent.title} class at ${matchEvent.location}, from ${matchEvent.start} to ${matchEvent.end}`);
                    
                    // Click event to see details or remove
                    evEl.addEventListener('click', (e) => {
                        e.stopPropagation();
                        announceToScreenReader(`Event clicked: ${matchEvent.title} at ${matchEvent.location}.`);
                    });

                    cell.appendChild(evEl);
                } else {
                    // Click empty cell to add session
                    cell.addEventListener('click', () => {
                        // Pre-populate Add Session fields
                        document.getElementById('session-date').value = getDummyDateForDay(day);
                        document.getElementById('session-time').value = slot.start;
                        switchView('addSession');
                        document.getElementById('module-name').focus();
                    });
                }

                row.appendChild(cell);
            });

            calendarGrid.appendChild(row);
        });
    }

    // Helper to supply a proper HTML Date string based on mock week starting Mon 12th May 2026
    function getDummyDateForDay(day) {
        const offsets = { 'Mon': 12, 'Tue': 13, 'Wed': 14, 'Thu': 15, 'Fri': 16 };
        const dayNum = offsets[day] || 12;
        return `2026-05-${dayNum}`;
    }

    // Form Submission for scheduling study session
    const addSessionForm = document.getElementById('add-session-form');
    addSessionForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const moduleName = document.getElementById('module-name').value;
        const description = document.getElementById('task-description').value;
        const dateVal = document.getElementById('session-date').value; // yyyy-mm-dd
        const timeVal = document.getElementById('session-time').value; // hh:mm

        // Determine matching day from date
        const dateObj = new Date(dateVal);
        const dayNum = dateObj.getDate();
        
        let targetDay = 'Mon';
        if (dayNum === 13) targetDay = 'Tue';
        if (dayNum === 14) targetDay = 'Wed';
        if (dayNum === 15) targetDay = 'Thu';
        if (dayNum === 16) targetDay = 'Fri';

        // Calculate end time (+1 hour)
        const hourPart = parseInt(timeVal.split(':')[0]);
        const minPart = timeVal.split(':')[1];
        const endHour = (hourPart + 1).toString().padStart(2, '0');
        const endTime = `${endHour}:${minPart}`;

        // Create new calendar event
        const newEvent = {
            id: state.events.length + 1,
            title: moduleName,
            location: 'Self Study Block',
            day: targetDay,
            start: timeVal,
            end: endTime,
            type: 'study-green' // Green study block
        };

        state.events.push(newEvent);

        // Also add as a dashboard task automatically to make the app extra cohesive!
        state.tasks.push({
            id: state.tasks.length + 1,
            title: `Review ${moduleName}`,
            desc: `${description} • Scheduled: ${targetDay} ${timeVal}`,
            badge: 'NORMAL',
            checked: false
        });

        // Re-render and navigate
        renderCalendar();
        renderTasks();
        updateStatsAndGoal();
        
        addSessionForm.reset();
        switchView('calendar');
        announceToScreenReader(`Study session "${moduleName}" scheduled successfully on ${targetDay} at ${timeVal}.`);
    });

    // ==========================================================================
    // STUDY GROUPS & CHAT SIMULATOR
    // ==========================================================================
    const groupsGrid = document.getElementById('groups-grid');
    const groupsListContainer = document.getElementById('groups-list-container');
    const chatRoomContainer = document.getElementById('chat-room-container');
    const backToGroupsBtn = document.getElementById('back-to-groups-btn');

    const openCreateGroupBtn = document.getElementById('open-create-group-modal-btn');
    const createGroupModal = document.getElementById('create-group-modal');
    const closeGroupModalBtn = document.getElementById('close-group-modal-btn');
    const cancelGroupModalBtn = document.getElementById('cancel-group-modal-btn');
    const createGroupForm = document.getElementById('create-group-form');

    function renderGroups() {
        if (!groupsGrid) return;
        groupsGrid.innerHTML = '';

        state.groups.forEach(group => {
            const card = document.createElement('div');
            card.className = 'group-card';
            card.innerHTML = `
                <div class="group-card-header">
                    <div class="group-avatar-icon" style="background-color: ${group.initialBg}; color: ${group.initialColor};">
                        ${group.title.substring(0,2).toUpperCase()}
                    </div>
                    <span class="group-status-tag tag-public">${group.type}</span>
                </div>
                <div class="group-card-body">
                    <h3>${group.title}</h3>
                    <p>${group.desc}</p>
                </div>
                <div class="group-card-footer">
                    <div class="group-members-list">
                        <span class="group-members-label">${group.members} members</span>
                    </div>
                    <button class="join-group-action-btn ${group.joined ? 'joined' : ''}">
                        ${group.joined ? 'Chat Room' : 'Join Group'}
                    </button>
                </div>
            `;

            const actionBtn = card.querySelector('.join-group-action-btn');
            actionBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!group.joined) {
                    group.joined = true;
                    group.members += 1;
                    renderGroups();
                    announceToScreenReader(`Joined group "${group.title}". You can now access the chat room.`);
                } else {
                    // Load chat room directly
                    openChatRoom(group.id);
                }
            });

            // Click card body to read detail or join
            card.addEventListener('click', () => {
                if (group.joined) {
                    openChatRoom(group.id);
                } else {
                    announceToScreenReader(`Group description: ${group.desc}. Click Join Group to chat.`);
                }
            });

            groupsGrid.appendChild(card);
        });

        // Add Dotted card for creating group
        const dottedCard = document.createElement('div');
        dottedCard.className = 'group-card start-group-card';
        dottedCard.innerHTML = `
            <div class="start-group-icon">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 5v14M5 12h14"></path>
                </svg>
            </div>
            <h3>Start Your Own</h3>
            <p>Can't find what you're looking for? Start a new group today.</p>
        `;
        
        dottedCard.addEventListener('click', () => {
            createGroupModal.classList.remove('hidden');
            document.getElementById('group-title-input').focus();
            announceToScreenReader("Create Group dialog opened.");
        });

        groupsGrid.appendChild(dottedCard);
    }

    // Modal creation handlers
    const hideGroupModal = () => {
        createGroupModal.classList.add('hidden');
        openCreateGroupBtn.focus();
    };

    closeGroupModalBtn.addEventListener('click', hideGroupModal);
    cancelGroupModalBtn.addEventListener('click', hideGroupModal);

    createGroupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = document.getElementById('group-title-input').value;
        const desc = document.getElementById('group-desc-input').value;
        const type = document.getElementById('group-type').value;

        const newId = title.toLowerCase().replace(/\s+/g, '-');
        const newGroup = {
            id: newId,
            title,
            desc,
            type,
            members: 1,
            joined: true,
            initialBg: 'var(--color-accent-purple-light)',
            initialColor: 'var(--color-accent-purple)'
        };

        state.groups.push(newGroup);
        state.chatMessages[newId] = [
            { sender: 'System', text: `Welcome to the ${title} group! Send a message to start cooperating.`, time: 'Just Now', self: false }
        ];

        renderGroups();
        hideGroupModal();
        createGroupForm.reset();
        announceToScreenReader(`Study group "${title}" created. Navigating to Chat room.`);
        openChatRoom(newId);
    });

    // Chat Room Interaction
    const chatMessagesThread = document.getElementById('chat-messages-thread');
    const chatMessageForm = document.getElementById('chat-message-form');
    const chatMessageInput = document.getElementById('chat-message-input');
    const chatGroupTitle = document.getElementById('chat-group-title');

    function openChatRoom(groupId) {
        state.activeGroupChat = groupId;
        const group = state.groups.find(g => g.id === groupId);
        
        if (!group) return;

        chatGroupTitle.textContent = group.title;
        groupsListContainer.classList.add('hidden');
        chatRoomContainer.classList.remove('hidden');

        renderChatMessages();
        announceToScreenReader(`Entered chat room for "${group.title}".`);
    }

    function closeChatRoom() {
        state.activeGroupChat = null;
        chatRoomContainer.classList.add('hidden');
        groupsListContainer.classList.remove('hidden');
        announceToScreenReader("Returned to Study Groups directory.");
    }

    backToGroupsBtn.addEventListener('click', closeChatRoom);

    function renderChatMessages() {
        if (!chatMessagesThread || !state.activeGroupChat) return;
        chatMessagesThread.innerHTML = '';

        const messages = state.chatMessages[state.activeGroupChat] || [];
        messages.forEach(msg => {
            const bubble = document.createElement('div');
            bubble.className = `chat-message-bubble ${msg.self ? 'outgoing' : 'incoming'}`;
            
            const initials = msg.sender.substring(0,1).toUpperCase();
            const avatarBg = msg.self ? 'var(--color-primary)' : 'var(--color-accent-purple)';

            bubble.innerHTML = `
                <div class="chat-user-avatar" style="background-color: ${avatarBg};">
                    ${initials}
                </div>
                <div class="chat-bubble-body">
                    <span class="chat-bubble-meta">${msg.sender} • ${msg.time}</span>
                    <p class="chat-bubble-text">${msg.text}</p>
                </div>
            `;
            chatMessagesThread.appendChild(bubble);
        });

        chatMessagesThread.scrollTop = chatMessagesThread.scrollHeight;
    }

    chatMessageForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = chatMessageInput.value;
        if (!text.trim() || !state.activeGroupChat) return;

        // Append user message
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        state.chatMessages[state.activeGroupChat].push({
            sender: 'Siyabonga (You)',
            text: text,
            time: timeStr,
            self: true
        });

        chatMessageInput.value = '';
        renderChatMessages();
        announceToScreenReader(`Message sent: "${text}".`);

        // Simulated reply after 1.5 seconds
        setTimeout(() => {
            if (state.activeGroupChat === 'java') {
                const responses = [
                    "Oh! That makes a lot of sense, thanks Siyabonga. I'll rewrite my base case conditions.",
                    "Are we going to code standard merge sort examples in the study room tomorrow?",
                    "Thanks, I was really stuck on that base case bug."
                ];
                const replyText = responses[Math.floor(Math.random() * responses.length)];
                
                state.chatMessages['java'].push({
                    sender: 'Thabo',
                    text: replyText,
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    self: false
                });

                if (state.activeGroupChat === 'java') {
                    renderChatMessages();
                    announceToScreenReader(`New message received from Thabo: "${replyText}".`);
                }
            } else {
                // Generic mock response
                const replyText = "Great! Let's schedule that on the Calendar so we don't forget.";
                state.chatMessages[state.activeGroupChat].push({
                    sender: 'StudyPartner',
                    text: replyText,
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    self: false
                });
                renderChatMessages();
                announceToScreenReader(`New reply received: "${replyText}".`);
            }
        }, 1500);
    });


    // ==========================================================================
    // ACCESSIBILITY SETTINGS PANEL
    // ==========================================================================
    const themeButtons = document.querySelectorAll('#theme-controls .theme-option-btn');
    const fontSizeSlider = document.getElementById('font-size-slider');
    const fontSizeValue = document.getElementById('font-size-value');
    const lineSpacingSelect = document.getElementById('line-spacing-select');
    const dyslexicToggle = document.getElementById('dyslexic-font-toggle');
    const ttsToggle = document.getElementById('tts-reader-toggle');
    const reducedMotionToggle = document.getElementById('reduced-motion-toggle');

    // 1. Contrast Themes
    themeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            themeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const theme = btn.dataset.theme;
            
            // Remove previous theme classes from body
            document.body.classList.remove('theme-normal', 'theme-high-contrast', 'theme-dark-high-contrast', 'theme-monochrome');
            // Add new theme class
            document.body.classList.add(`theme-${theme}`);
            state.accessibility.theme = theme;

            const themeNames = {
                'normal': 'Default Light Mode',
                'high-contrast': 'High Contrast Light Mode',
                'dark-high-contrast': 'High Contrast Dark Mode',
                'monochrome': 'Monochrome Grayscale Mode'
            };

            announceToScreenReader(`App color theme changed to ${themeNames[theme]}.`);
        });
    });

    // 2. Font Sizing scale
    const fontSizeScaleTexts = {
        '1': 'Small (85%)',
        '2': 'Medium (100%)',
        '3': 'Large (125%)',
        '4': 'Extra Large (150%)'
    };
    const fontSizeStyleValues = {
        '1': '14px',
        '2': '16px',
        '3': '20px',
        '4': '24px'
    };

    fontSizeSlider.addEventListener('input', (e) => {
        const val = e.target.value;
        const textVal = fontSizeScaleTexts[val];
        fontSizeValue.textContent = textVal;
        
        // Update range aria text value for native accessibility
        fontSizeSlider.setAttribute('aria-valuetext', textVal);
        fontSizeSlider.setAttribute('aria-valuenow', val);

        // Adjust root CSS font scale
        document.documentElement.style.setProperty('--base-font-size', fontSizeStyleValues[val]);
        state.accessibility.fontSize = val;

        announceToScreenReader(`Font size changed to ${textVal}.`);
    });

    // 3. Line Spacing scale
    const spacingValues = {
        'normal': '1.5',
        'cozy': '1.75',
        'spacious': '2.1'
    };

    lineSpacingSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        document.documentElement.style.setProperty('--base-line-height', spacingValues[val]);
        state.accessibility.lineSpacing = val;
        
        announceToScreenReader(`Line spacing adjusted to ${val}.`);
    });

    // 4. Dyslexic-Friendly Font
    dyslexicToggle.addEventListener('change', (e) => {
        const active = e.target.checked;
        state.accessibility.dyslexicFont = active;
        
        if (active) {
            document.body.classList.add('theme-dyslexic');
            announceToScreenReader("Dyslexic-Friendly font mode enabled. Text layout spacing widened.");
        } else {
            document.body.classList.remove('theme-dyslexic');
            announceToScreenReader("Dyslexic-Friendly font mode disabled.");
        }
    });

    // 5. Text-To-Speech (TTS) Toggle
    ttsToggle.addEventListener('change', (e) => {
        const active = e.target.checked;
        state.accessibility.ttsEnabled = active;

        if (active) {
            announceToScreenReader("Text-to-speech reader enabled. Hover or focus any text block to read it aloud.");
        } else {
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
            announceToScreenReader("Text-to-speech reader disabled.");
        }
    });

    // 6. Reduced Motion Toggle
    reducedMotionToggle.addEventListener('change', (e) => {
        const active = e.target.checked;
        state.accessibility.reducedMotion = active;

        if (active) {
            document.body.classList.add('theme-reduced-motion');
            announceToScreenReader("Reduced motion active. Animated transitions are disabled.");
        } else {
            document.body.classList.remove('theme-reduced-motion');
            announceToScreenReader("Reduced motion disabled.");
        }
    });

    // Initialize TTS hover handlers
    setupTtsHoverListeners();

    // ==========================================================================
    // INITIAL APP INITIALIZATION
    // ==========================================================================
    renderTasks();
    renderCalendar();
    renderGroups();
    
    // Announce system load completion
    setTimeout(() => {
        announceToScreenReader("StudySync application ready. Default theme applied. All systems active.");
    }, 800);
});
