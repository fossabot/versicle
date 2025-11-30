const regex = /https?:\/\/(?:www\.)?([-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6})\b(?:[-a-zA-Z0-9()@:%_+.~#?&//=]*)/;
const text = "You can find the sermons at https://old.thecrossing.website/sermons.";
const match = text.match(regex);
console.log(match);
