
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionName = urlParams.get('sessionName');
    let words = [];
    let currentWord = {};
    let score = 0;
    console.log(sessionName)

    if (sessionName) {
        fetch(`/search-words?keyw=${encodeURIComponent(sessionName)}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    words = data.words;
                    console.log(words)
                    displayRandomWord();
                } else {
                    toastr.error('Could not retrieve words. Please try again.');
                }
            })
            .catch(error => {
                toastr.error('An error occurred while fetching words.');
                console.error('Error fetching words:', error);
            });
    }

    document.getElementById('submitAnswer').addEventListener('click', checkAnswer);

    function displayRandomWord() {
        if (words.length === 0) {
            handleCompletion();
            return;
        }
        currentWord = words.splice(Math.floor(Math.random() * words.length), 1)[0];
        const wordCard = document.getElementById('wordCard');
        wordCard.textContent = englishMode ? currentWord.english : currentWord.vietnamese;
        applyRandomEffect(wordCard);
    }

    function checkAnswer() {
        const answer = document.getElementById('inputAnswer').value.trim();
        const englishMode = document.getElementById('englishMode').checked;
        const correctAnswer = englishMode ? currentWord.vietnamese : currentWord.english;

        if (answer.toLowerCase() === correctAnswer.toLowerCase()) {
            score += 10;
            toastr.success('Correct! +10 points');
        } else {
            score -= 5;
            toastr.error('Incorrect! -5 points');
        }

        document.getElementById('score').textContent = score;
        document.getElementById('inputAnswer').value = '';
        displayRandomWord();
    }

    function handleCompletion() {
        const submitButton = document.getElementById('submitAnswer');
        submitButton.disabled = true;
        if (score > 0) {
            showCelebration();
        } else {
            showSadFace();
        }
    }

    function applyRandomEffect(element) {
        const effects = ['slideInLeft', 'zoomIn', 'fadeIn','heartbeat' ,'flipInX','fadeOut','pulse','rotateIn','bounceIn'];
        const randomEffect = effects[Math.floor(Math.random() * effects.length)];
        console.log(randomEffect)
        element.classList.add('animated', randomEffect);
        setTimeout(() => {
            element.classList.remove('animated', randomEffect);
        }, 1000);
    }

    function showCelebration() {
        const duration = 2 * 1000;
        const end = Date.now() + duration;

        (function frame() {
            confetti({
                particleCount: 2,
                angle: 60,
                spread: 55,
                origin: { x: 0 }
            });
            confetti({
                particleCount: 2,
                angle: 120,
                spread: 55,
                origin: { x: 1 }
            });

            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        }());
    }

    function showSadFace() {
        const duration = 2 * 1000; // 2 seconds
        const end = Date.now() + duration;
    
        (function frame() {
            const effectContainer = document.getElementById('effectContainer');
            const sadFace = document.createElement('div');
            sadFace.classList.add('sad-face');
            sadFace.textContent = ':(';
    
            // Randomize the position and add it to the effectContainer
            sadFace.style.position = 'absolute';
            sadFace.style.top = `${Math.random() * 100}%`;
            sadFace.style.left = `${Math.random() * 100}%`;
            effectContainer.appendChild(sadFace);
    
            sadFace.classList.add('animated', 'fadeIn');
            setTimeout(() => {
                sadFace.classList.remove('animated', 'fadeIn');
                effectContainer.removeChild(sadFace);
            }, 1000);
    
            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        }());
    }
});
