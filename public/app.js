document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const dataUrl = urlParams.get('data');
    
    fetch(`/quiz?data=${encodeURIComponent(dataUrl)}`)
        .then(response => response.json())
        .then(data => {
            initializeGame(data);
        })
        .catch(error => console.error('Error fetching data:', error));

    function initializeGame(data) {
        const wordCard = document.getElementById('wordCard');
        const inputAnswer = document.getElementById('inputAnswer');
        const submitAnswer = document.getElementById('submitAnswer');
        const skipButton = document.getElementById('skip');
        const hintButton = document.getElementById('hint');
        const scoreElement = document.getElementById('score');
        const hintModal = document.getElementById('hintModal');
        const hintContent = document.getElementById('hintContent');
        const closeModal = document.getElementsByClassName('close')[0];

        let score = 0;
        let currentWordIndex = 0;
        let currentType = ""
        let timeLeft = data.time ? parseInt(data.time*60) : null;
        let hintCount = 0;

 ///START TIME PROCESS    
        let progressBar = document.querySelector('.e-c-progress');
        let indicator = document.getElementById('e-indicator');
        let pointer = document.getElementById('e-pointer');
        let length = Math.PI * 2 * 100;

        progressBar.style.strokeDasharray = length;

        function update(value, timePercent) {
            var offset = - length - length * value / (timePercent);
            progressBar.style.strokeDashoffset = offset; 
            pointer.style.transform = `rotate(${360 * value / (timePercent)}deg)`; 
        };

        //circle ends
        const displayOutput = document.querySelector('.display-remain-time')

        let intervalTimer;
        let wholeTime = timeLeft; // manage this to set the whole time 
        let isStarted = false;

        if (wholeTime != null) {
            update(wholeTime,wholeTime); //refreshes progress bar
            displayTimeLeft(wholeTime);
        }

        function changeWholeTime(seconds){
            if ((wholeTime + seconds) > 0){
                wholeTime += seconds;
                update(wholeTime,wholeTime);
            }
        }

        function timer (seconds){ //counts time, takes seconds
            let remainTime = Date.now() + (seconds * 1000);
            displayTimeLeft(seconds);
            
            intervalTimer = setInterval(function(){
                timeLeft = Math.round((remainTime - Date.now()) / 1000);
                if(timeLeft < 0){
                    //Show result
                    console.log("Time out")
                    clearInterval(intervalTimer);
                    return ;
                }
                displayTimeLeft(timeLeft);
            }, 1000);
        }

        function displayTimeLeft (timeLeft){ //displays time on the input
            let minutes = Math.floor(timeLeft / 60);
            let seconds = timeLeft % 60;
            let displayString = `${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
            displayOutput.textContent = displayString;
            update(timeLeft, wholeTime);
        }
        if (wholeTime != null) {
            timer(wholeTime);
            isStarted = true;
        }
 ///END TIME PROCESS       
        if (data.skip) {
            skipButton.style.display = 'block';
        }

        if (data.hint) {
            hintButton.style.display = 'block';
        }

        displayWord();

        submitAnswer.addEventListener('click', () => {
            checkAnswer();
        });

        skipButton.addEventListener('click', () => {
            skipWord();
        });

        hintButton.addEventListener('click', () => {
            showHint();
        });

        closeModal.addEventListener('click', () => {
            hintModal.style.display = 'none';
        });

        window.addEventListener('click', (event) => {
            if (event.target == hintModal) {
                hintModal.style.display = 'none';
            }
        });

        function displayWord() {
            const word = data.words[currentWordIndex];
            if(data.type === 'random') {
                ran = Math.round(Math.random())
                if(ran == 0)
                    currentType = 'en-vn';
                else
                    currentType = 'vn-en';
            } else {
                currentType = data.type;
            }
            wordCard.textContent = currentType === 'en-vn' ? word.english : word.vietnamese;
        }

        function checkAnswer() {
            const word = data.words[currentWordIndex];
            const correctAnswer = currentType === 'en-vn' ? word.vietnamese : word.english;

            if (inputAnswer.value.toLowerCase() === correctAnswer.toLowerCase()) {
                updateScore(word.level, true);
                if (data.correctDisplay) {
                    alert('Correct! The answer is: ' + correctAnswer);
                }
            } else {
                updateScore(word.level, false);
                if (data.correctDisplay) {
                    alert('Incorrect! The correct answer was: ' + correctAnswer);
                }
            }

            inputAnswer.value = '';
            currentWordIndex = (currentWordIndex + 1) % data.words.length;
            displayWord();
        }

        function updateScore(level, isCorrect, isHint=false, isSkip=false) {
            let scoreChange = 0;
            if (isHint) {
                if (level === 'Easy') {
                    scoreChange = -parseInt(data.hintMinusScoreEasy);
                } else if (level === 'Medium') {
                    scoreChange = -parseInt(data.hintMinusScoreMedium);
                } else if (level === 'Hard') {
                    scoreChange = -parseInt(data.hintMinusScoreHard);
                }
            } else {
                if (isSkip) {
                    if (level === 'Easy') {
                        scoreChange = -parseInt(data.skipMinusScoreEasy);
                    } else if (level === 'Medium') {
                        scoreChange = -parseInt(data.skipMinusScoreMedium);
                    } else if (level === 'Hard') {
                        scoreChange = -parseInt(data.skipMinusScoreHard);
                    }
                } else {
                    if (isCorrect) {
                        if (level === 'Easy') {
                            scoreChange = parseInt(data.rightPlusScoreEasy);
                        } else if (level === 'Medium') {
                            scoreChange = parseInt(data.rightPlusScoreMedium);
                        } else if (level === 'Hard') {
                            scoreChange = parseInt(data.rightPlusScoreHard);
                        }
                    } else {
                        if (level === 'Easy') {
                            scoreChange = -parseInt(data.wrongMinusScoreEasy);
                        } else if (level === 'Medium') {
                            scoreChange = -parseInt(data.wrongMinusScoreMedium);
                        } else if (level === 'Hard') {
                            scoreChange = -parseInt(data.wrongMinusScoreHard);
                        }
                    }
                }
            }

            score += scoreChange;
            scoreElement.textContent = score;
        }

        function skipWord() {
            const word = data.words[currentWordIndex];
            updateScore(word.level, false, false, true);

            inputAnswer.value = '';
            currentWordIndex = (currentWordIndex + 1) % data.words.length;
            displayWord();
        }

        function showHint() {
            hintModal.style.display = 'block';
            const word = data.words[currentWordIndex];
            const correctAnswer = currentType === 'en-vn' ? word.vietnamese : word.english;
            const words = correctAnswer.split('');

            hintContent.innerHTML = '';
            //hintContent.style.textAlign = 'center'
            words.forEach(word => {
                const wordElement = document.createElement('span');
                if(word == ' ') {
                    wordElement.textContent = " ";
                    wordElement.style.margin = '10px';
                    wordElement.style.padding = '10px';
                    wordElement.style.border = '1px solid #ddd';
                    wordElement.style.borderRadius = '4px';
                    hintContent.appendChild(wordElement);
                } else {
                    wordElement.textContent = "_";
                    wordElement.style.margin = '10px';
                    wordElement.style.padding = '10px';
                    wordElement.style.border = '1px solid #ddd';
                    wordElement.style.borderRadius = '4px';
                    wordElement.style.cursor = 'pointer';
                    wordElement.style.backgroundColor = 'gray';
    
                    wordElement.addEventListener('click', () => {
                        hintCount++;
                        if (hintCount > parseInt(data.maxHint)) {
                            hintButton.disabled = true;
                            hintButton.style.backgroundColor = "gray"
                        } else {
                            updateScore(data.words[currentWordIndex].level,true,true, false)
                            wordElement.textContent = word;
                            wordElement.style.backgroundColor = 'greenyellow';
                        }
                        
                    });
    
                    hintContent.appendChild(wordElement);
                }
            });
        }

        function stopGame() {
            alert('Time is up!');
            // Handle stopping the game and displaying the final score or results.
        }
    }
});
