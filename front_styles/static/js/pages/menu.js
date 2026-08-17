const menuScroll = document.querySelector("#menu-scroll");
const categoryButtons = [...document.querySelectorAll(".category-button")];
const menuCategories = [...document.querySelectorAll(".menu-category")];

function selectCategory(categoryId) {
    categoryButtons.forEach((button) => {
        const isCurrentCategory = button.dataset.target === categoryId;
        button.classList.toggle("is-active", isCurrentCategory);
        button.setAttribute("aria-pressed", String(isCurrentCategory));
    });
}

if (menuScroll && categoryButtons.length && menuCategories.length) {
    categoryButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const category = document.querySelector(`#${button.dataset.target}`);

            if (!category) {
                return;
            }

            menuScroll.scrollTo({
                top: category.offsetTop - 16,
                behavior: "smooth",
            });

            selectCategory(category.id);
        });
    });

    let isUpdatingCategory = false;

    menuScroll.addEventListener("scroll", () => {
        if (isUpdatingCategory) {
            return;
        }

        isUpdatingCategory = true;

        requestAnimationFrame(() => {
            const currentPosition = menuScroll.scrollTop + 48;
            const reachedMenuEnd = menuScroll.scrollTop + menuScroll.clientHeight >= menuScroll.scrollHeight - 2;
            let currentCategory = menuCategories[0];

            menuCategories.forEach((category) => {
                if (category.offsetTop <= currentPosition) {
                    currentCategory = category;
                }
            });

            if (reachedMenuEnd) {
                currentCategory = menuCategories.at(-1);
            }

            selectCategory(currentCategory.id);
            isUpdatingCategory = false;
        });
    });

    selectCategory(menuCategories[0].id);
}
