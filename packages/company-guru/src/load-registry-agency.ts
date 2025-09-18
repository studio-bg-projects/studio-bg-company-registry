import * as path from 'node:path';
import * as fs from 'node:fs';
import * as process from 'node:process';

const dir = path.join(__dirname, '../.data/');
console.log('dir', dir);

fs.readdirSync(dir).forEach(file => {
  console.log('File', file);

  const fullPath = path.join(dir, file);
  const extension = path.extname(fullPath);

  if (extension !== '.json') {
    return;
  }

  const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  data.elements.forEach((elsRoot: any) => {
    elsRoot.elements.forEach((elsMessage: any) => {
      if (elsMessage.name !== 'Body') {
        return;
      }

      elsMessage.elements.forEach((elsBody: any) => {
        if (elsBody.name !== 'Deeds') {
          return;
        }

        elsBody.elements.forEach((elsDeed: any) => {
          if (elsDeed.name !== 'Deed') {
            return;
          }

          // elsDeed.attributes.DeedStatus = ['E', 'N', 'L', 'C']
          if (elsDeed.attributes.DeedStatus === 'E') {
            console.log('elsDeed.attributes.DeedStatus', elsDeed.attributes);
          }
          // console.log('>>>', Object.keys(elsDeed), elsDeed.attributes);
        });
      });
    });
  });
  // process.exit();
});
