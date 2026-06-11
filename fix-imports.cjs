const fs = require('fs')
const path = require('path')

const featuresDir = path.join(__dirname, 'src', 'features')

function walk(dir) {
  let results = []
  const list = fs.readdirSync(dir)
  list.forEach(file => {
    file = path.join(dir, file)
    const stat = fs.statSync(file)
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file))
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      results.push(file)
    }
  })
  return results
}

const files = walk(featuresDir)

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8')
  
  // Replace standard ../lib to ../../../lib
  content = content.replace(/'\.\.\/lib\//g, "'../../../lib/")
  
  // Replace specific cross-feature contexts
  content = content.replace(/'\.\.\/\.\.\/contexts\//g, "'../../../../contexts/")
  content = content.replace(/'\.\.\/contexts\//g, "'../../../contexts/")
  
  // Replace dashboard component imports since they moved inside dashboard
  content = content.replace(/'\.\.\/components\/Dashboard\//g, "'../components/")
  
  fs.writeFileSync(file, content, 'utf8')
})

console.log('Imports fixed!')
