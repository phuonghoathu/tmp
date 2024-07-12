let mediaRecorder;
let audioChunks = [];
let audioBlob;

document.addEventListener("DOMContentLoaded", () => {
    fetch('/get-sessions')
        .then(response => {
            if (response.status === 401) {
                showLoginPopup();
            } else {
                return response.json();
            }
        })
        .then(data => {
            const dropdown = document.getElementById('sessionDropdown');
            console.log(data)
            data.sessions.forEach(ss => {
                const option = document.createElement('option');
                option.value = ss.session_encode;
                option.text = ss.session;
                dropdown.add(option);
            });
            const addOption = document.createElement('option');
            addOption.value = 'add-session';
            addOption.text = 'Add Session';
            dropdown.add(addOption);
        });

    document.getElementById('sessionDropdown').addEventListener('change', (event) => {
        if (event.target.value === 'add-session') {
            openPopup();
        }
    });

    // Function to handle clicks on the "Edit" and "Delete" buttons
    document.querySelector('.word-list tbody').addEventListener('click', function (event) {
        if (event.target.classList.contains('edit')) {
            const row = event.target.closest('tr');
            const english = row.children[0].textContent;
            const vietnamese = row.children[1].textContent;
            const id = row.children[2].textContent;
            //english, vietnamese, id, level, description, imageUrl
            openEditPopup(english, vietnamese, id, row.children[3].textContent
                ,row.children[5].querySelector('.tooltiptext')?row.children[5].querySelector('.tooltiptext').textContent:"",
                row.children[4].querySelector('img')?row.children[4].querySelector('img').getAttribute('alt'):"",row);
        } else if (event.target.classList.contains('delete')) {
            const row = event.target.closest('tr');
            const english = row.children[0].textContent;
            const vietnamese = row.children[1].textContent;
            const id = row.children[2].textContent;
            deleteWord(id, row);
        }
    });
});

function showLoginPopup() {
    document.getElementById('loginPopup').style.display = 'block';
}

function closeLoginPopup() {
    document.getElementById('loginPopup').style.display = 'none';
}

function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    fetch('/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                toastr.success('Logged in successfully');
                closeLoginPopup();
                window.location.reload();
            } else {
                toastr.error(data.message || 'Invalid username or password');
            }
        });
}

function openPopup() {
    document.getElementById('sessionPopup').style.display = 'block';
}

function closePopup() {
    document.getElementById('sessionPopup').style.display = 'none';
}
function copySessionDropdownOptions() {
    const sessionDropdown = document.getElementById('sessionDropdown');
    const modalSessionDropdown = document.getElementById('modalSessionDropdown');
    modalSessionDropdown.innerHTML = '';

    Array.from(sessionDropdown.options).forEach(option => {
        const newOption = document.createElement('option');
        if(option.value == 'add-session') {
            newOption.value = 'all';
            newOption.text = "All";
        } else {
            newOption.value = option.value;
            newOption.text = option.text;
        }
        modalSessionDropdown.appendChild(newOption);
    });
    
    modalSessionDropdown.value = sessionDropdown.value
    modalSessionDropdown.text = sessionDropdown.text
}

function addWord() {
    const english = document.getElementById('english').value;
    const vietnamese = document.getElementById('vietnamese').value;
    const session = document.getElementById('sessionDropdown').value;
    const level = document.getElementById('level').value;
    const description = document.getElementById('description').value;
    const imageUpload = document.getElementById('imageUpload').files[0];

    const formData = new FormData();
    formData.append('english', english);
    formData.append('vietnamese', vietnamese);
    formData.append('session', session);
    formData.append('level', level);
    formData.append('description', description);
    if (imageUpload) {
        formData.append('image', imageUpload, `${session}_${english}.jpg`);
    }
    if(audioBlob) {
        formData.append('audio', audioBlob, 'audio.wav');
    }

    fetch('/add-word', {
        method: 'POST',
        body: formData
    }).then(response => response.json())
        .then(data => {
            if (data.success) {
                toastr.success('Từ mới đã được thêm!');
                // Clear the input fields
                document.getElementById('english').value = '';
                document.getElementById('vietnamese').value = '';
                document.getElementById('description').value = '';
                document.getElementById('imageUpload').value = '';
                document.getElementById('level').value = 'medium';
            } else {
                toastr.error('Có lỗi xảy ra, vui lòng thử lại!');
            }
        });
}

function saveSession() {
    const newSessionName = document.getElementById('newSessionName').value;
    fetch('/add-session', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ session: newSessionName })
    }).then(response => response.json())
        .then(data => {
            if (data.success) {
                toastr.success('Session mới đã được thêm!');
                const dropdown = document.getElementById('sessionDropdown');
                const option = document.createElement('option');
                option.value = data.session_encode;
                option.text = newSessionName;
                dropdown.add(option, dropdown.length - 1);
                dropdown.value = data.session_encode;
                closePopup();
            } else {
                toastr.error('Có lỗi xảy ra, vui lòng thử lại!');
            }
        });
}

function searchWords() {
    const selectedSession = document.getElementById('sessionDropdown').value;
    if (selectedSession === 'add-session') {
        toastr.error('Vui lòng chọn một session hợp lệ để tìm kiếm.');
        return;
    }

    fetch(`/search-words?keyw=${encodeURIComponent(selectedSession)}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const wordListBody = document.querySelector('.word-list tbody');
                wordListBody.innerHTML = ''; // Clear existing rows

                data.words.forEach(word => {
                    const row = document.createElement('tr');
                    const englishCell = document.createElement('td');
                    const vietnameseCell = document.createElement('td');
                    const word_id = document.createElement('td');
                    const hardLevelCell = document.createElement('td');
                    const imageCell = document.createElement('td');
                    const audioCell = document.createElement('td');
                    const descriptionCell = document.createElement('td');
                    const actionsCell = document.createElement('td');

                    englishCell.textContent = word.english;
                    vietnameseCell.textContent = word.vietnamese;
                    hardLevelCell.textContent = word.level;

                    // Handle description with tooltip
                    const descriptionDiv = document.createElement('div');
                    descriptionDiv.className = 'tooltip';
                    descriptionDiv.textContent = word.description.length > 20 ? word.description.substring(0, 20) + '...' : word.description;
                    const tooltipSpan = document.createElement('span');
                    tooltipSpan.className = 'tooltiptext';
                    tooltipSpan.textContent = word.description;
                    descriptionDiv.appendChild(tooltipSpan);
                    descriptionCell.appendChild(descriptionDiv);

                    // Handle image display with popup
                    if (word.imageUrl) {
                        const imgIcon = document.createElement('img');
                        imgIcon.src = '/uploads/icon/view.png'; // Replace with your icon path
                        imgIcon.alt = `/uploads/${word.imageUrl}`;
                        imgIcon.style.cursor = 'pointer';
                        imgIcon.onclick = () => {
                            const imgPopup = document.createElement('img');
                            imgPopup.src = `/uploads/${word.imageUrl}`;
                            imgPopup.style.maxWidth = '100%';
                            imgPopup.style.maxHeight = '100%';
                            imgPopup.style.padding= '4px';

                            const popupDiv = document.createElement('div');
                            popupDiv.style.position = 'fixed';
                            popupDiv.style.top = 'center';
                            popupDiv.style.left = 'center';
                        //    popupDiv.style.width = '400px';
                          //  popupDiv.style.height = '500px';
                            popupDiv.style.backgroundColor = 'rgb(125 106 106 / 80%)';
                            popupDiv.style.display = 'flex';
                            popupDiv.style.alignItems = 'center';
                            popupDiv.style.justifyContent = 'center';
                            popupDiv.style.cursor = 'pointer';
                            popupDiv.onclick = () => {
                                document.body.removeChild(popupDiv);
                            };

                            popupDiv.appendChild(imgPopup);
                            document.body.appendChild(popupDiv);
                        };
                        imageCell.appendChild(imgIcon);
                    }

                    word_id.textContent = word.id
                    word_id.hidden = true
                    actionsCell.innerHTML = '<button class="edit">Sửa</button><button class="delete">Xóa</button>';

                    if(word.audio) {
                        const playIcon = document.createElement('i');
                        playIcon.classList.add('fas', 'fa-play-circle', 'icon-button');
                        playIcon.addEventListener('click', () => {
                            const audio = new Audio(`/uploads/${word.audio}`);
                            audio.play();
                        });
                        audioCell.appendChild(playIcon);
                    }

                    row.appendChild(englishCell);
                    row.appendChild(vietnameseCell);
                    row.appendChild(word_id);
                    row.appendChild(hardLevelCell);
                    row.appendChild(imageCell);
                    row.appendChild(audioCell);
                    row.appendChild(descriptionCell);
                    row.appendChild(actionsCell);

                    wordListBody.appendChild(row);
                });
            } else {
                toastr.infor('Không tìm thấy từ nào cho session này.');
            }
        });
}

function getLink() {
    copySessionDropdownOptions();
    const myLink = document.getElementById('myModal_gen_link');
    myLink.style.top = 'center';
    myLink.style.left = 'center';
    myLink.style.display = 'block';
}

function closePopup_getlink() {
    document.getElementById('myModal_gen_link').style.display = 'none';
}

function createLink() {
    const session = document.getElementById('modalSessionDropdown').value;
    const numberQuestion = document.getElementById('numberQuestion').value;

    const hard = document.getElementById('numberQuestionLevelHard').value;
    const medium = document.getElementById('numberQuestionLevelMedium').value;
    const easy = document.getElementById('numberQuestionLevelEasy').value;

    const type = document.getElementById('type').value;
    const time = document.getElementById('time').value;
    const tryAgainTimes = document.getElementById('tryAgainTimes').value;
    
    const wrongMinusScoreHard = document.getElementById('wrongMinusLevelHard').value;
    const wrongMinusScoreMedium = document.getElementById('wrongMinusLevelMedium').value;
    const wrongMinusScoreEasy = document.getElementById('wrongMinusLevelEasy').value;

    const rightPlusScoreHard = document.getElementById('rightPlusLevelHard').value;
    console.log('rightPlusScoreHard')
    console.log(rightPlusScoreHard)
    const rightPlusScoreMedium = document.getElementById('rightPlusLevelMedium').value;
    const rightPlusScoreEasy = document.getElementById('rightPlusLevelEasy').value;

    const skipMinusScoreHard = document.getElementById('skipMinusLevelHard').value;
    const skipMinusScoreMedium = document.getElementById('skipMinusLevelMedium').value;
    const skipMinusScoreEasy = document.getElementById('skipMinusLevelEasy').value;

    const hintMinusScoreHard = document.getElementById('hintMinusLevelHard').value;
    const hintMinusScoreMedium = document.getElementById('hintMinusLevelHedium').value;
    const hintMinusScoreEasy = document.getElementById('hintMinusLevelEasy').value;

    const skip = document.getElementById('skip').checked;
    const hint = document.getElementById('hint').checked;
    const maxHint = document.getElementById('maxHit').value;
    const correctCheck = document.getElementById('correctCheck').checked;
    const correctDisplay = document.getElementById('correctDisplay').checked;

    /* Kiểm tra xem có ít nhất một trường trong các trường hard, medium, hoặc easy được nhập hay không
    const isAnyQuestionSet = hard || medium || easy;

    // Nếu có ít nhất một trường được nhập mà numberQuestion lại không được nhập
    if (isAnyQuestionSet && !numberQuestion) {
        toastr.error('Vui lòng nhập số câu hỏi (Number Question) nếu bạn đã nhập bất kỳ số lượng câu hỏi nào nào.');
        return;
    }*/

    const data = {
        session,
        numberQuestion,
        hard,
        medium,
        easy,
        type,
        time,
        tryAgainTimes,
        wrongMinusScore: { hard: wrongMinusScoreHard, medium: wrongMinusScoreMedium, easy: wrongMinusScoreEasy },
        rightPlusScore: { hard: rightPlusScoreHard, medium: rightPlusScoreMedium, easy: rightPlusScoreEasy },
        skipMinusScore: { hard: skipMinusScoreHard, medium: skipMinusScoreMedium, easy: skipMinusScoreEasy },
        hintMinusScore: { hard: hintMinusScoreHard, medium: hintMinusScoreMedium, easy: hintMinusScoreEasy },
        skip,
        hint,
        maxHint,
        correctCheck,
        correctDisplay
    };

    fetch('/create-url', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            // Display the created URL or do something with it
            console.log('Created URL:', result.url);
        } else {
            // Handle error
            console.error('Error creating URL:', result.message);
        }
    });
}

function closeEditPopup(element) {
    const popup = element.closest('.popup');
    document.body.removeChild(popup);
}

function openEditPopup(english, vietnamese, id, level, description, imageUrl) {
    const editPopup = document.createElement('div');
    editPopup.classList.add('popup');
    console.log(description)
    editPopup.innerHTML = `
        <div class="popup-content">
            <span class="close" onclick="closeEditPopup(this)">&times;</span>
            <h2>Chỉnh sửa từ</h2>
            <input type="text" id="editEnglish" value="${english}">
            <input type="text" id="editVietnamese" value="${vietnamese}">
            <br/>
            <select id="editLevel">
                <option value="Easy" ${level === 'Easy' ? 'selected' : ''}>Easy</option>
                <option value="Medium" ${level === 'Medium' ? 'selected' : ''}>Medium</option>
                <option value="Hard" ${level === 'Hard' ? 'selected' : ''}>Hard</option>
            </select>
            <input type="file" id="editImage">
            ${imageUrl ? `<br/><img src="${imageUrl}" alt="Image" style="max-width: 100px; max-height: 100px;">` : ''}
            <br/>
            <textarea id="editDescription">${description}</textarea>
            <br/>
            
            <button id="buttonEditWord" onclick="saveEditWord('${id}', this)">Save</button>
        </div>
    `;
    document.body.appendChild(editPopup);
    editPopup.style.display = 'block';
}

function saveEditWord( id, button) {
    const newEnglish = document.getElementById('editEnglish').value;
    const newVietnamese = document.getElementById('editVietnamese').value;
    const newLevel = document.getElementById('editLevel').value;
    const newDescription = document.getElementById('editDescription').value;
    const newImageFile = document.getElementById('editImage').files[0];
    const session = document.getElementById('sessionDropdown').value;

    


    const formData = new FormData();
    formData.append('id', id);
    formData.append('newEnglish', newEnglish);
    formData.append('newVietnamese', newVietnamese);
    formData.append('newLevel', newLevel);
    formData.append('newDescription', newDescription);
    formData.append('english', newEnglish);
    formData.append('session', session);
    if (newImageFile) {
        formData.append('newImage', newImageFile);
    }

    fetch('/edit-word', {
        method: 'POST',
        body: formData
    }).then(response => response.json())
        .then(data => {
            if (data.success) {
                toastr.success('Từ đã được cập nhật!');
                searchWords();
                closeEditPopup(button);
            } else {
                toastr.error('Có lỗi xảy ra, vui lòng thử lại!');
            }
        });
}

function deleteWord(id, row) {
    fetch('/delete-word', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id })
    }).then(response => response.json())
        .then(data => {
            if (data.success) {
                toastr.success('Từ đã được xóa!');
                row.remove();
            } else {
                toastr.error('Có lỗi xảy ra, vui lòng thử lại!');
            }
        });
}

document.getElementById('start-recording').addEventListener('click', async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.start();

    mediaRecorder.addEventListener('dataavailable', event => {
        audioChunks.push(event.data);
    });

    mediaRecorder.addEventListener('stop', () => {
        audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        document.getElementById('audio-playback').src = audioUrl;

        audioChunks = [];
        document.getElementById('upload-recording').disabled = false;
    });

    document.getElementById('start-recording').disabled = true;
    document.getElementById('stop-recording').disabled = false;
});

document.getElementById('stop-recording').addEventListener('click', () => {
    mediaRecorder.stop();
    document.getElementById('start-recording').disabled = false;
    document.getElementById('stop-recording').disabled = true;
});
