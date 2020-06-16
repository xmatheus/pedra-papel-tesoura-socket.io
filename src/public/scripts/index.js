const baseUrl = window.location.origin

const socket = io('192.168.0.107:3000', { multiplex: false })

const submit = () => {
  const name = document.getElementById('name').value
  console.log(name)
  if (name) {
    socket.emit('sendMessage', name)
  }
}

const resetGifs = () => {
  const bodymovin = document.getElementById('bodymovin')
  document.getElementById('result-text').innerText = ''
  if (bodymovin) { bodymovin.remove() }

  const myDiv = document.createElement('div')
  myDiv.id = 'bodymovin'

  document.getElementById('result').appendChild(myDiv)
}

const selectName = () => {
  const name = document.querySelector('#user-name').value
  const ctnLogin = document.querySelector('.login-ctn')
  const login = document.querySelector('.login')
  ctnLogin.style.top = '-60%'
  login.style.top = '50%'
  login.style.opacity = 1
  socket.emit('setPlayer', { name })
}

const play = (element) => {
  resetGifs()
  const option = element.querySelector('p').innerText
  socket.emit('play', option)
}

socket.on('connectToRoom', function (data) {
  document.getElementById('msg').innerText = data
})

socket.on('message', function (data) {
  document.getElementById('msg').innerText = data
})

socket.on('timeSearch', (data) => {
  document.getElementById('timeSearch').innerText = `${data}`
})

socket.on('enemy', (data) => {
  const selectedImg = `./assets/peopleImage/${Math.floor(Math.random() * 5) + 1}.svg`
  document.querySelector('#enemy-name').innerText = data
  document.querySelector('#enemy-img').src = selectedImg
  document.querySelector('.ctn-enemy').style.top = '0%'
})

socket.on('timeEnd', function (data) {
  // document.getElementById('timeSearch').innerText = `${data}`

  document.querySelector('.login').style.opacity = 0
  document.querySelector('#animation').style.opacity = 0

  setTimeout(() => {
    document.querySelector('.login').remove()
    document.querySelector('#animation').remove()
  }, 1000)

  document.querySelector('.game-card').style.top = '50%'
})

// fechou a janela
window.addEventListener('beforeunload', function (e) {
  socket.emit('end')
})

socket.on('ganhou', function (data) {
  console.log('ganhou')
  resetGifs()
  document.getElementById('result-text').innerHTML = 'Ganhou'
  const animData = {
    wrapper: document.getElementById('bodymovin'),
    animType: 'html',
    loop: true,
    prerender: true,
    autoplay: true,
    path: './assets/win.json'

  }
  bodymovin.loadAnimation(animData)
  document.getElementById('bodymovin').style.opacity = 1
})

socket.on('empate', function (data) {
  console.log('empate')
  resetGifs()
  document.getElementById('result-text').innerHTML = 'Empatou'
  document.getElementById('bodymovin').style.opacity = 1
  const animData = {
    wrapper: document.getElementById('bodymovin'),
    animType: 'html',
    loop: true,
    prerender: true,
    autoplay: true,
    path: './assets/empate.json'

  }
  bodymovin.loadAnimation(animData)
})

socket.on('perdeu', function (data) {
  console.log('perdeu')
  resetGifs()
  document.getElementById('result-text').innerHTML = 'hi hi, perdeu.'
  document.getElementById('bodymovin').style.opacity = 1
  const animData = {
    wrapper: document.getElementById('bodymovin'),
    animType: 'html',
    loop: true,
    prerender: true,
    autoplay: true,
    path: './assets/loser.json'

  }
  bodymovin.loadAnimation(animData)
})
