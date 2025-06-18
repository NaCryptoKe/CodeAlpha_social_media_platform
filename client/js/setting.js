document.addEventListener('DOMContentLoaded', () => {
    const settingsBtn = document.getElementById('settingsBtn');

    if (settingsBtn)
    {
        settingsBtn.addEventListener('click', () => {
            window.location.href='../setting.html';
        });
    }
});