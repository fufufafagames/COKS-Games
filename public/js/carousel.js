"use strict";

document.addEventListener('DOMContentLoaded', function() {
    const next = document.querySelector(".next");
    const prev = document.querySelector(".prev");
    const slide = document.querySelector(".slide");
    
    if (!next || !prev || !slide) return;

    function moveNext() {
        let items = document.querySelectorAll(".item");
        slide.appendChild(items[0]);
    }

    function movePrev() {
        let items = document.querySelectorAll(".item");
        slide.prepend(items[items.length - 1]);
    }

    next.addEventListener("click", moveNext);
    prev.addEventListener("click", movePrev);

    // Optional: Auto-advance
    // setInterval(moveNext, 5000);
});
