const regex = /https?:\/\/(?:www\.)?([-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,63})\b(?:[-a-zA-Z0-9()@:%_+.~#?&//=]*[^.,?!:;"'\s])?/;
const t1 = "You can find the sermons at https://old.thecrossing.website/sermons.";
const t2 = "File at https://example.com/file.html";
const t3 = "Link https://example.com/foo.";
console.log('t1:', t1.match(regex)[0]);
console.log('t2:', t2.match(regex)[0]);
console.log('t3:', t3.match(regex)[0]);
