(() => {
    "use strict";

    const initialDataNode = document.querySelector("#home-data");
    const tabs = [...document.querySelectorAll("[data-tab]")];
    const panels = [...document.querySelectorAll("[data-panel]")];
    const coffeeForm = document.querySelector("#coffee-form");
    const categoryForm = document.querySelector("#category-form");
    const coffeeSubmit = document.querySelector("#coffee-submit");
    const categoryList = document.querySelector("#category-list");
    const categoryTotal = document.querySelector("#category-total");
    const categoryHelp = document.querySelector("#category-help");
    const recentCoffees = document.querySelector("#recent-coffees");
    const coffeeTotal = document.querySelector("#coffee-total");
    const toast = document.querySelector("#toast");
    const toastMessage = document.querySelector("#toast-message");

    const picker = {
        root: document.querySelector("#coffee-category-picker"),
        trigger: document.querySelector("#coffee-category"),
        value: document.querySelector("#coffee-category-value"),
        menu: document.querySelector("#coffee-category-menu"),
        input: document.querySelector("#coffee-category-input"),
    };

    const coffeeFields = {
        name: document.querySelector("#coffee-name"),
        price: document.querySelector("#coffee-price"),
        description: document.querySelector("#coffee-description"),
        image: document.querySelector("#coffee-image"),
    };

    const preview = {
        name: document.querySelector("#preview-name"),
        category: document.querySelector("#preview-category"),
        price: document.querySelector("#preview-price"),
        description: document.querySelector("#preview-description"),
        photo: document.querySelector("#preview-photo"),
        imageContainer: document.querySelector("#preview-image"),
        descriptionCount: document.querySelector("#description-count"),
    };

    const confirmDialog = {
        layer: document.querySelector("#confirm-layer"),
        title: document.querySelector("#confirm-title"),
        message: document.querySelector("#confirm-message"),
        cancel: document.querySelector("#confirm-cancel"),
        accept: document.querySelector("#confirm-accept"),
    };

    const csrfToken = document.querySelector("[name='csrfmiddlewaretoken']")?.value || "";
    const expandedCategories = new Set();
    let selectedCategoryId = "";
    let toastTimer;
    let pendingConfirmation = null;
    let confirmationReturnFocus = null;
    let mutationInProgress = false;
    let state = parseInitialData();

    const icons = {
        coffee: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 8h11v6.2A4.8 4.8 0 0 1 11.2 19H9.8A4.8 4.8 0 0 1 5 14.2V8Z" /><path d="M16 10h1.7a2.3 2.3 0 0 1 0 4.6H16" /></svg>',
        chevron: '<svg class="category-chevron" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m7 10 5 5 5-5" /></svg>',
        up: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m7 14 5-5 5 5" /></svg>',
        down: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m7 10 5 5 5-5" /></svg>',
        trash: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 7h14M9 7V4h6v3M8 10v7M12 10v7M16 10v7M7 7l1 13h8l1-13" /></svg>',
    };

    function parseInitialData() {
        try {
            return normalizeState(JSON.parse(initialDataNode?.textContent || "{}"));
        } catch (error) {
            return { categories: [], coffees: [] };
        }
    }

    function normalizeState(data) {
        return {
            categories: Array.isArray(data?.categories)
                ? data.categories.map((category) => ({
                    ...category,
                    id: String(category.id),
                    coffeeCount: Number(category.coffeeCount || 0),
                }))
                : [],
            coffees: Array.isArray(data?.coffees)
                ? data.coffees.map((coffee) => ({
                    ...coffee,
                    id: String(coffee.id),
                    categoryId: String(coffee.categoryId),
                    price: Number(coffee.price || 0),
                }))
                : [],
        };
    }

    function showPanel(panelName) {
        tabs.forEach((tab) => {
            const isCurrent = tab.dataset.tab === panelName;
            tab.classList.toggle("is-active", isCurrent);
            tab.setAttribute("aria-selected", String(isCurrent));
            tab.tabIndex = isCurrent ? 0 : -1;
        });

        panels.forEach((panel) => {
            const isCurrent = panel.dataset.panel === panelName;
            panel.hidden = !isCurrent;
            panel.classList.toggle("is-active", isCurrent);
        });

        history.replaceState(null, "", `#${panelName}`);
    }

    function showToast(message, isError = false) {
        window.clearTimeout(toastTimer);
        toastMessage.textContent = message;
        toast.classList.toggle("is-error", isError);
        toast.classList.add("is-visible");
        toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 3400);
    }

    function getCategory(categoryId) {
        return state.categories.find((category) => category.id === String(categoryId));
    }

    function getCategoryCoffees(categoryId) {
        return state.coffees.filter((coffee) => coffee.categoryId === String(categoryId));
    }

    function normalizePrice(rawValue) {
        const cleaned = String(rawValue)
            .trim()
            .replace(/\s/g, "")
            .replace(/^R\$/i, "")
            .replace(/\.(?=\d{3}(?:\D|$))/g, "")
            .replace(",", ".")
            .replace(/[^\d.]/g, "");
        const value = Number.parseFloat(cleaned);
        return Number.isFinite(value) ? Math.max(0, value) : 0;
    }

    function formatPrice(value) {
        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(Number(value) || 0);
    }

    async function requestMutation(action, data = {}) {
        if (mutationInProgress) {
            throw new Error("Aguarde a operação atual terminar.");
        }

        mutationInProgress = true;
        try {
            const response = await fetch(window.location.pathname, {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": csrfToken,
                    "X-Requested-With": "XMLHttpRequest",
                },
                body: JSON.stringify({ action, ...data }),
            });

            if (response.redirected && response.url.includes("/login/")) {
                throw new Error("Sua sessão expirou. Recarregue a página e entre novamente.");
            }

            let result;
            try {
                result = await response.json();
            } catch (error) {
                throw new Error("O servidor retornou uma resposta inválida.");
            }

            if (!response.ok || !result.ok) {
                throw new Error(result.error || "Não foi possível concluir a operação.");
            }

            state = normalizeState(result.data);
            renderAll();
            return result;
        } finally {
            mutationInProgress = false;
        }
    }

    function setPickerOpen(isOpen, focusOption = false) {
        if (isOpen && picker.trigger.disabled) return;
        picker.root.classList.toggle("is-open", isOpen);
        picker.trigger.setAttribute("aria-expanded", String(isOpen));
        picker.menu.hidden = !isOpen;

        if (isOpen && focusOption) {
            window.requestAnimationFrame(() => {
                const selected = picker.menu.querySelector(".category-option.is-selected");
                (selected || picker.menu.querySelector(".category-option"))?.focus();
            });
        }
    }

    function chooseCategory(categoryId) {
        const category = getCategory(categoryId);
        selectedCategoryId = category?.id || "";
        picker.input.value = selectedCategoryId;
        picker.value.textContent = category?.name || "Selecione uma categoria";
        picker.trigger.classList.toggle("has-value", Boolean(category));
        picker.trigger.removeAttribute("aria-invalid");
        renderPickerOptions();
        setPickerOpen(false);
        updatePreview();
    }

    function renderPickerOptions() {
        picker.menu.replaceChildren();

        if (!state.categories.length) {
            const empty = document.createElement("p");
            empty.className = "picker-empty";
            empty.textContent = "Nenhuma categoria cadastrada. Crie uma na aba Categorias.";
            picker.menu.append(empty);
            return;
        }

        state.categories.forEach((category) => {
            const option = document.createElement("button");
            option.className = "category-option";
            option.type = "button";
            option.role = "option";
            option.dataset.categoryOption = category.id;
            option.setAttribute("aria-selected", String(category.id === selectedCategoryId));
            option.classList.toggle("is-selected", category.id === selectedCategoryId);

            const name = document.createElement("span");
            name.textContent = category.name;
            const count = document.createElement("small");
            count.textContent = `${category.coffeeCount} ${category.coffeeCount === 1 ? "item" : "itens"}`;
            option.append(name, count);
            picker.menu.append(option);
        });
    }

    function renderPicker() {
        if (selectedCategoryId && !getCategory(selectedCategoryId)) {
            selectedCategoryId = "";
        }

        const selected = getCategory(selectedCategoryId);
        picker.input.value = selected?.id || "";
        picker.value.textContent = selected?.name || (state.categories.length
            ? "Selecione uma categoria"
            : "Nenhuma categoria cadastrada");
        picker.trigger.classList.toggle("has-value", Boolean(selected));
        picker.trigger.disabled = state.categories.length === 0;
        coffeeSubmit.disabled = state.categories.length === 0;
        categoryHelp.textContent = state.categories.length
            ? `${state.categories.length} ${state.categories.length === 1 ? "categoria disponível" : "categorias disponíveis"}.`
            : "Cadastre uma categoria para começar.";
        categoryHelp.classList.toggle("is-ready", state.categories.length > 0);
        renderPickerOptions();
    }

    function renderRecentCoffees() {
        coffeeTotal.textContent = `${state.coffees.length} ${state.coffees.length === 1 ? "item" : "itens"}`;
        recentCoffees.replaceChildren();

        if (!state.coffees.length) {
            const empty = document.createElement("li");
            empty.className = "empty-item";
            empty.textContent = "Nenhum café cadastrado ainda.";
            recentCoffees.append(empty);
            return;
        }

        state.coffees.slice(-3).reverse().forEach((coffee) => {
            const item = document.createElement("li");
            const icon = document.createElement("span");
            icon.innerHTML = icons.coffee;
            const copy = document.createElement("div");
            const name = document.createElement("strong");
            name.textContent = coffee.name;
            const details = document.createElement("small");
            details.textContent = `${getCategory(coffee.categoryId)?.name || "Sem categoria"} • ${formatPrice(coffee.price)}`;
            copy.append(name, details);
            item.append(icon, copy);
            recentCoffees.append(item);
        });
    }

    function createActionButton(className, label, icon, dataset = {}) {
        const button = document.createElement("button");
        button.className = className;
        button.type = "button";
        button.setAttribute("aria-label", label);
        button.title = label;
        Object.entries(dataset).forEach(([key, value]) => {
            button.dataset[key] = String(value);
        });
        button.innerHTML = icon;
        return button;
    }

    function createCoffeeImage(coffee) {
        const imageBox = document.createElement("span");
        imageBox.className = "category-coffee-image";

        if (!coffee.image) {
            imageBox.innerHTML = icons.coffee;
            return imageBox;
        }

        const image = document.createElement("img");
        image.src = coffee.image;
        image.alt = "";
        image.addEventListener("error", () => {
            imageBox.replaceChildren();
            imageBox.innerHTML = icons.coffee;
        }, { once: true });
        imageBox.append(image);
        return imageBox;
    }

    function renderCategoryProducts(container, category) {
        const coffees = getCategoryCoffees(category.id);
        if (!coffees.length) {
            const empty = document.createElement("p");
            empty.className = "category-products-empty";
            empty.textContent = "Nenhum item cadastrado nesta categoria.";
            container.append(empty);
            return;
        }

        const list = document.createElement("ul");
        list.className = "category-products-list";

        coffees.forEach((coffee) => {
            const item = document.createElement("li");
            item.className = "category-coffee";

            const copy = document.createElement("div");
            copy.className = "category-coffee-copy";
            const name = document.createElement("strong");
            name.textContent = coffee.name;
            const description = document.createElement("small");
            description.textContent = coffee.description;
            copy.append(name, description);

            const price = document.createElement("span");
            price.className = "category-coffee-price";
            price.textContent = formatPrice(coffee.price);

            const remove = createActionButton(
                "coffee-delete",
                `Excluir ${coffee.name}`,
                icons.trash,
                { deleteCoffee: coffee.id },
            );

            item.append(createCoffeeImage(coffee), copy, price, remove);
            list.append(item);
        });

        container.append(list);
    }

    function renderCategories() {
        categoryTotal.textContent = String(state.categories.length);
        categoryList.replaceChildren();

        if (!state.categories.length) {
            const empty = document.createElement("li");
            empty.className = "category-empty";
            const icon = document.createElement("span");
            icon.innerHTML = icons.coffee;
            const title = document.createElement("strong");
            title.textContent = "Nenhuma categoria ainda";
            const copy = document.createElement("p");
            copy.textContent = "Crie a primeira categoria usando o formulário ao lado.";
            empty.append(icon, title, copy);
            categoryList.append(empty);
            return;
        }

        state.categories.forEach((category, index) => {
            const isExpanded = expandedCategories.has(category.id);
            const item = document.createElement("li");
            item.className = "category-item";
            item.classList.toggle("is-expanded", isExpanded);

            const row = document.createElement("div");
            row.className = "category-row";

            const main = document.createElement("button");
            main.className = "category-main";
            main.type = "button";
            main.dataset.categoryToggle = category.id;
            main.setAttribute("aria-expanded", String(isExpanded));

            const number = document.createElement("span");
            number.className = "category-index";
            number.textContent = String(index + 1).padStart(2, "0");

            const copy = document.createElement("span");
            copy.className = "category-copy";
            const title = document.createElement("strong");
            title.textContent = category.name;
            const description = document.createElement("span");
            description.textContent = category.description;
            copy.append(title, description);

            const count = document.createElement("span");
            count.className = "category-count";
            count.textContent = `${category.coffeeCount} ${category.coffeeCount === 1 ? "item" : "itens"}`;
            const chevron = document.createElement("span");
            chevron.innerHTML = icons.chevron;
            main.append(number, copy, count, chevron.firstElementChild);

            const actions = document.createElement("div");
            actions.className = "category-actions";
            const moveUp = createActionButton(
                "category-action",
                `Mover ${category.name} para cima`,
                icons.up,
                { moveCategory: category.id, direction: -1 },
            );
            moveUp.disabled = index === 0;
            const moveDown = createActionButton(
                "category-action",
                `Mover ${category.name} para baixo`,
                icons.down,
                { moveCategory: category.id, direction: 1 },
            );
            moveDown.disabled = index === state.categories.length - 1;
            const remove = createActionButton(
                "category-action category-action--delete",
                `Excluir categoria ${category.name}`,
                icons.trash,
                { deleteCategory: category.id },
            );
            actions.append(moveUp, moveDown, remove);
            row.append(main, actions);

            const products = document.createElement("div");
            products.className = "category-products";
            products.hidden = !isExpanded;
            renderCategoryProducts(products, category);

            item.append(row, products);
            categoryList.append(item);
        });
    }

    function updatePreview() {
        const name = coffeeFields.name.value.trim();
        const description = coffeeFields.description.value.trim();
        const imageUrl = coffeeFields.image.value.trim();
        const category = getCategory(selectedCategoryId);

        preview.name.textContent = name || "Seu café especial";
        preview.category.textContent = category?.name || "Sem categoria";
        preview.price.textContent = formatPrice(normalizePrice(coffeeFields.price.value));
        preview.description.textContent = description || "A descrição do produto aparecerá aqui.";
        preview.descriptionCount.textContent = String(coffeeFields.description.value.length);

        if (imageUrl) {
            preview.photo.src = imageUrl;
            preview.photo.alt = name ? `Prévia de ${name}` : "Prévia do café";
            preview.photo.hidden = false;
            preview.imageContainer.classList.add("has-photo");
        } else {
            preview.photo.removeAttribute("src");
            preview.photo.alt = "";
            preview.photo.hidden = true;
            preview.imageContainer.classList.remove("has-photo");
        }
    }

    function renderAll() {
        renderPicker();
        renderRecentCoffees();
        renderCategories();
        updatePreview();
    }

    function setFormLoading(form, isLoading) {
        form.querySelectorAll("button").forEach((button) => {
            button.disabled = isLoading;
            if (button.type === "submit") button.classList.toggle("is-loading", isLoading);
        });
        if (!isLoading) renderPicker();
    }

    function openConfirmation({ title, message, confirmLabel = "Excluir", action }) {
        confirmationReturnFocus = document.activeElement;
        pendingConfirmation = action;
        confirmDialog.title.textContent = title;
        confirmDialog.message.textContent = message;
        confirmDialog.accept.textContent = confirmLabel;
        confirmDialog.layer.hidden = false;
        window.requestAnimationFrame(() => confirmDialog.cancel.focus());
    }

    function closeConfirmation() {
        confirmDialog.layer.hidden = true;
        pendingConfirmation = null;
        confirmDialog.accept.disabled = false;
        confirmationReturnFocus?.focus?.();
        confirmationReturnFocus = null;
    }

    async function moveCategory(categoryId, direction) {
        const currentIndex = state.categories.findIndex((category) => category.id === categoryId);
        const nextIndex = currentIndex + direction;
        if (currentIndex < 0 || nextIndex < 0 || nextIndex >= state.categories.length) return;

        const orderedIds = state.categories.map((category) => category.id);
        [orderedIds[currentIndex], orderedIds[nextIndex]] = [orderedIds[nextIndex], orderedIds[currentIndex]];

        try {
            const result = await requestMutation("reorder_categories", { categoryIds: orderedIds });
            showToast(result.message);
        } catch (error) {
            showToast(error.message, true);
        }
    }

    tabs.forEach((tab, tabIndex) => {
        tab.addEventListener("click", () => showPanel(tab.dataset.tab));
        tab.addEventListener("keydown", (event) => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
            event.preventDefault();
            let nextIndex = tabIndex;
            if (event.key === "ArrowLeft") nextIndex = (tabIndex - 1 + tabs.length) % tabs.length;
            if (event.key === "ArrowRight") nextIndex = (tabIndex + 1) % tabs.length;
            if (event.key === "Home") nextIndex = 0;
            if (event.key === "End") nextIndex = tabs.length - 1;
            tabs[nextIndex].focus();
            showPanel(tabs[nextIndex].dataset.tab);
        });
    });

    picker.trigger.addEventListener("click", () => {
        setPickerOpen(picker.menu.hidden);
    });

    picker.trigger.addEventListener("keydown", (event) => {
        if (!["ArrowDown", "ArrowUp"].includes(event.key)) return;
        event.preventDefault();
        setPickerOpen(true, true);
    });

    picker.menu.addEventListener("click", (event) => {
        const option = event.target.closest("[data-category-option]");
        if (option) chooseCategory(option.dataset.categoryOption);
    });

    picker.menu.addEventListener("keydown", (event) => {
        const options = [...picker.menu.querySelectorAll(".category-option")];
        const currentIndex = options.indexOf(document.activeElement);

        if (event.key === "Escape") {
            event.preventDefault();
            setPickerOpen(false);
            picker.trigger.focus();
            return;
        }

        if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        let nextIndex = currentIndex;
        if (event.key === "ArrowDown") nextIndex = Math.min(currentIndex + 1, options.length - 1);
        if (event.key === "ArrowUp") nextIndex = Math.max(currentIndex - 1, 0);
        if (event.key === "Home") nextIndex = 0;
        if (event.key === "End") nextIndex = options.length - 1;
        options[nextIndex]?.focus();
    });

    document.addEventListener("click", (event) => {
        if (!picker.root.contains(event.target)) setPickerOpen(false);
    });

    [coffeeFields.name, coffeeFields.price, coffeeFields.description, coffeeFields.image].forEach((field) => {
        field.addEventListener("input", updatePreview);
    });

    preview.photo.addEventListener("error", () => {
        preview.photo.hidden = true;
        preview.imageContainer.classList.remove("has-photo");
    });

    coffeeFields.price.addEventListener("blur", () => {
        const value = normalizePrice(coffeeFields.price.value);
        if (coffeeFields.price.value.trim()) {
            coffeeFields.price.value = value.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            });
            updatePreview();
        }
    });

    coffeeForm.addEventListener("reset", () => {
        window.requestAnimationFrame(() => {
            selectedCategoryId = "";
            renderPicker();
            updatePreview();
        });
    });

    coffeeForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!coffeeForm.reportValidity()) return;

        if (!selectedCategoryId) {
            picker.trigger.setAttribute("aria-invalid", "true");
            picker.trigger.focus();
            showToast("Escolha uma categoria para o café.", true);
            return;
        }

        const price = normalizePrice(coffeeFields.price.value);
        if (price <= 0) {
            coffeeFields.price.setCustomValidity("Informe um preço maior que zero.");
            coffeeFields.price.reportValidity();
            coffeeFields.price.setCustomValidity("");
            return;
        }

        setFormLoading(coffeeForm, true);
        try {
            const result = await requestMutation("create_coffee", {
                name: coffeeFields.name.value.trim(),
                categoryId: selectedCategoryId,
                price: price.toFixed(2),
                description: coffeeFields.description.value.trim(),
                image: coffeeFields.image.value.trim(),
            });
            coffeeForm.reset();
            showToast(result.message);
            coffeeFields.name.focus();
        } catch (error) {
            showToast(error.message, true);
        } finally {
            setFormLoading(coffeeForm, false);
        }
    });

    categoryForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!categoryForm.reportValidity()) return;

        const nameField = document.querySelector("#category-name");
        const descriptionField = document.querySelector("#category-description");
        setFormLoading(categoryForm, true);

        try {
            const result = await requestMutation("create_category", {
                name: nameField.value.trim(),
                description: descriptionField.value.trim(),
            });
            categoryForm.reset();
            selectedCategoryId = String(result.createdId);
            renderPicker();
            updatePreview();
            showToast(result.message);
            nameField.focus();
        } catch (error) {
            showToast(error.message, true);
        } finally {
            setFormLoading(categoryForm, false);
        }
    });

    categoryList.addEventListener("click", (event) => {
        const toggle = event.target.closest("[data-category-toggle]");
        if (toggle) {
            const categoryId = toggle.dataset.categoryToggle;
            if (expandedCategories.has(categoryId)) expandedCategories.delete(categoryId);
            else expandedCategories.add(categoryId);
            renderCategories();
            return;
        }

        const move = event.target.closest("[data-move-category]");
        if (move) {
            moveCategory(move.dataset.moveCategory, Number(move.dataset.direction));
            return;
        }

        const deleteCategory = event.target.closest("[data-delete-category]");
        if (deleteCategory) {
            const category = getCategory(deleteCategory.dataset.deleteCategory);
            if (!category) return;
            const count = getCategoryCoffees(category.id).length;
            openConfirmation({
                title: `Excluir “${category.name}”?`,
                message: count
                    ? `A categoria e ${count === 1 ? "seu item serão removidos" : `seus ${count} itens serão removidos`} do cardápio.`
                    : "A categoria será removida do cardápio. Essa ação não pode ser desfeita.",
                action: () => requestMutation("delete_category", { categoryId: category.id }),
            });
            return;
        }

        const deleteCoffee = event.target.closest("[data-delete-coffee]");
        if (deleteCoffee) {
            const coffee = state.coffees.find((item) => item.id === deleteCoffee.dataset.deleteCoffee);
            if (!coffee) return;
            openConfirmation({
                title: `Excluir “${coffee.name}”?`,
                message: "O item deixará de aparecer no cardápio. Essa ação não pode ser desfeita.",
                action: () => requestMutation("delete_coffee", { coffeeId: coffee.id }),
            });
        }
    });

    confirmDialog.cancel.addEventListener("click", closeConfirmation);
    confirmDialog.layer.addEventListener("click", (event) => {
        if (event.target === confirmDialog.layer) closeConfirmation();
    });
    confirmDialog.accept.addEventListener("click", async () => {
        if (!pendingConfirmation) return;
        confirmDialog.accept.disabled = true;
        try {
            const result = await pendingConfirmation();
            closeConfirmation();
            showToast(result.message);
        } catch (error) {
            confirmDialog.accept.disabled = false;
            showToast(error.message, true);
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !confirmDialog.layer.hidden) closeConfirmation();
    });

    const initialPanel = window.location.hash === "#categorias" ? "categorias" : "cafes";
    renderAll();
    showPanel(initialPanel);
})();
