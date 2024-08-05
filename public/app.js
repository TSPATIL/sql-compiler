require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.31.1/min/vs' } });

let elem = document.documentElement;

/* View in fullscreen */
function openFullscreen() {
  if (elem.requestFullscreen) {
    elem.requestFullscreen();
  } else if (elem.webkitRequestFullscreen) { /* Safari */
    elem.webkitRequestFullscreen();
  } else if (elem.msRequestFullscreen) { /* IE11 */
    elem.msRequestFullscreen();
  }
}

/* Close fullscreen */
function closeFullscreen() {
  if (document.exitFullscreen) {
    document.exitFullscreen();
  } else if (document.webkitExitFullscreen) { /* Safari */
    document.webkitExitFullscreen();
  } else if (document.msExitFullscreen) { /* IE11 */
    document.msExitFullscreen();
  }
}

require(['vs/editor/editor.main'], function () {
    const editor = monaco.editor.create(document.getElementById('editor-container'), {
        value: '-- Enter your SQL query here',
        language: 'sql',
        theme: 'vs-dark',
    });

    document.getElementById('start-game').addEventListener('click', () => {
        if (confirm("Your session is going to start. We are switching to fullscreen. Avoid coming out of fullscreen while session is on else session will end and game will stop.")) {
            openFullscreen();
            fetch('/start', { method: 'POST' })
                .then(response => response.json())
                .then(data => {
                    // alert(`Game started with user ID: ${data.userId}`);
                    document.getElementById('user-id-span').innerHTML = `${data.userId}`;
                })
                .catch(error => console.error('Error:', error));
        }
    });

    document.getElementById('end-game').addEventListener('click', () => {
        if (confirm("You are about to close the session")) {
            closeFullscreen();
            fetch('/end', { method: 'POST' })
                .then(response => response.json())
                .then(data => {
                    // alert(data.message);
                    document.getElementById('user-id-span').innerHTML = `Click start game to generate user's session id`;
                })
                .catch(error => console.error('Error:', error));
        }
    });

    document.getElementById('execute-query').addEventListener('click', () => {
        const sqlQuery = editor.getValue();
        fetch('/execute', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ sql: sqlQuery })
        })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    document.getElementById("prompt").textContent = "Execution Unsuccessful";
                    document.getElementById("prompt").style.color = "red";
                    document.getElementById('result').textContent = `Error: ${data.error}`;
                } else {
                    document.getElementById("prompt").textContent = "Execution Successful";
                    document.getElementById("prompt").style.color = "green";
                    document.getElementById('result').textContent = JSON.stringify(data.result, null, 2);
                }
            })
            .catch(error => console.error('Error:', error));
    });
});
