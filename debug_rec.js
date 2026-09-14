import { recognizer } from './public/src/recognizer.js';

const circleStroke = [];
for (let a = 0; a <= Math.PI * 2; a += 0.15) {
  circleStroke.push({ x: 200 + Math.cos(a) * 80, y: 200 + Math.sin(a) * 80 });
}

const sqStroke = [];
for (let x = 100; x <= 200; x += 10) sqStroke.push({ x, y: 100 });
for (let y = 100; y <= 200; y += 10) sqStroke.push({ x: 200, y });
for (let x = 200; x >= 100; x -= 10) sqStroke.push({ x, y: 200 });
for (let y = 200; y >= 100; y -= 10) sqStroke.push({ x: 100, y });

console.log("Circle:", recognizer.recognize([circleStroke]));
console.log("Square:", recognizer.recognize([sqStroke]));
