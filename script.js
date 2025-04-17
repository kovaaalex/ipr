document.addEventListener("DOMContentLoaded", function () {
  const searchForm = document.getElementById("search-form");
  const searchInput = document.getElementById("search-input");
  const resultsContainer = document.getElementById("results-container");
  const loadingElement = document.getElementById("loading");

  // Используем TheMealDB API
  const API_URL = "https://www.themealdb.com/api/json/v1/1/";

  // Поиск рецептов
  searchForm.addEventListener("submit", function (e) {
    e.preventDefault();
    const searchTerm = searchInput.value.trim(); // Исправлено: было searchTerm.value

    if (searchTerm === "") {
      showMessage("Пожалуйста, введите название блюда", "error");
      searchInput.focus();
      return;
    }

    searchRecipes(searchTerm);
  });

  // Функция поиска с улучшенной обработкой
  async function searchRecipes(query) {
    showLoading();
    clearResults();

    try {
      // Добавляем небольшую задержку для избежания частых запросов при быстром вводе
      await new Promise((resolve) => setTimeout(resolve, 300));

      const response = await fetch(
        `${API_URL}search.php?s=${encodeURIComponent(query)}`
      );

      if (!response.ok) {
        throw new Error(`Ошибка HTTP: ${response.status}`);
      }

      const data = await response.json();

      if (data.meals) {
        displayRecipes(data.meals);
      } else {
        showMessage("Рецепты не найдены. Попробуйте другой запрос.", "info");

        // Предлагаем альтернативные варианты
        tryAlternativeSearch(query);
      }
    } catch (error) {
      console.error("Ошибка при поиске рецептов:", error);
      showMessage(
        "Ошибка при загрузке рецептов. Пожалуйста, попробуйте позже.",
        "error"
      );

      // Показываем популярные рецепты в случае ошибки
      loadPopularRecipes();
    } finally {
      hideLoading();
    }
  }

  // Попробовать альтернативный поиск (по первой букве)
  async function tryAlternativeSearch(query) {
    if (query.length > 0) {
      try {
        const firstLetter = query[0].toLowerCase();
        const response = await fetch(`${API_URL}search.php?f=${firstLetter}`);
        const data = await response.json();

        if (data.meals) {
          showMessage(
            `Не найдено по запросу "${query}", но вот рецепты на букву "${firstLetter}":`,
            "info"
          );
          displayRecipes(data.meals);
        }
      } catch (error) {
        console.error("Ошибка при альтернативном поиске:", error);
      }
    }
  }

  // Отображение рецептов с улучшенной обработкой данных
  function displayRecipes(recipes) {
    // Сортируем рецепты по алфавиту
    recipes.sort((a, b) => a.strMeal.localeCompare(b.strMeal));

    recipes.forEach((recipe) => {
      try {
        const recipeCard = document.createElement("div");
        recipeCard.className = "recipe-card";

        // Проверяем и обрабатываем отсутствующие данные
        const imageUrl =
          recipe.strMealThumb ||
          "https://via.placeholder.com/300x200?text=No+Image";
        const youtubeUrl = recipe.strYoutube
          ? `https://www.youtube.com/watch?v=${
              recipe.strYoutube.split("v=")[1]
            }`
          : "#";
        const category = recipe.strCategory || "Не указана";

        recipeCard.innerHTML = `
            <img src="${imageUrl}" alt="${recipe.strMeal}" class="recipe-image" 
                 onerror="this.src='https://via.placeholder.com/300x200?text=Image+Error'">
            <div class="recipe-content">
              <h3 class="recipe-title">${recipe.strMeal}</h3>
              <span class="recipe-category">${category}</span>
              <div class="recipe-actions">
                <a href="${youtubeUrl}" target="_blank" class="recipe-link">
                  <i class="fas fa-play"></i> Видео
                </a>
                <button class="recipe-details" data-id="${recipe.idMeal}">
                  <i class="fas fa-info-circle"></i> Подробнее
                </button>
              </div>
            </div>
          `;

        resultsContainer.appendChild(recipeCard);
      } catch (error) {
        console.error("Ошибка при создании карточки рецепта:", error);
      }
    });

    // Добавляем обработчики для кнопок "Подробнее"
    document.querySelectorAll(".recipe-details").forEach((button) => {
      button.addEventListener("click", function () {
        const mealId = this.getAttribute("data-id");
        showRecipeDetails(mealId);
      });
    });
  }

  // Показать детали рецепта
  async function showRecipeDetails(mealId) {
    showLoading();
    try {
      const response = await fetch(`${API_URL}lookup.php?i=${mealId}`);
      const data = await response.json();

      if (data.meals && data.meals[0]) {
        const recipe = data.meals[0];
        showRecipeModal(recipe);
      }
    } catch (error) {
      console.error("Ошибка при загрузке деталей рецепта:", error);
      showMessage("Не удалось загрузить детали рецепта", "error");
    } finally {
      hideLoading();
    }
  }

  // Модальное окно с деталями рецепта
  function showRecipeModal(recipe) {
    // Создаем модальное окно
    const modal = document.createElement("div");
    modal.className = "modal";

    // Форматируем ингредиенты
    let ingredientsList = "";
    for (let i = 1; i <= 20; i++) {
      const ingredient = recipe[`strIngredient${i}`];
      const measure = recipe[`strMeasure${i}`];

      if (ingredient && ingredient.trim() !== "") {
        ingredientsList += `<li>${measure} ${ingredient}</li>`;
      }
    }

    modal.innerHTML = `
        <div class="modal-content">
          <span class="close-modal">&times;</span>
          <h2>${recipe.strMeal}</h2>
          <div class="modal-body">
            <div class="modal-image">
              <img src="${recipe.strMealThumb}" alt="${recipe.strMeal}">
            </div>
            <div class="modal-info">
              <h3>Ингредиенты:</h3>
              <ul>${ingredientsList}</ul>
              <h3>Инструкции:</h3>
              <p>${formatInstructions(recipe.strInstructions)}</p>
            </div>
          </div>
        </div>
      `;

    document.body.appendChild(modal);

    // Закрытие модального окна
    modal.querySelector(".close-modal").addEventListener("click", () => {
      document.body.removeChild(modal);
    });

    // Закрытие при клике вне модального окна
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
  }

  // Форматирование инструкций
  function formatInstructions(instructions) {
    if (!instructions) return "Инструкции не указаны";
    return instructions
      .split("\r\n")
      .filter((step) => step.trim() !== "")
      .map((step) => {
        return `<p>${step}</p>`;
      })
      .join("");
  }

  // Вспомогательные функции
  function showLoading() {
    loadingElement.style.display = "flex";
  }

  function hideLoading() {
    loadingElement.style.display = "none";
  }

  function clearResults() {
    resultsContainer.innerHTML = "";
  }

  function showMessage(message, type = "info") {
    const messageElement = document.createElement("div");
    messageElement.className = `message ${type}`;
    messageElement.textContent = message;
    resultsContainer.appendChild(messageElement);

    // Автоматическое скрытие сообщения через 5 секунд
    setTimeout(() => {
      if (messageElement.parentNode) {
        messageElement.parentNode.removeChild(messageElement);
      }
    }, 5000);
  }

  // Загрузить популярные рецепты при загрузке страницы
  async function loadPopularRecipes() {
    showLoading();
    clearResults();

    try {
      // Ищем несколько категорий для разнообразия
      const categories = ["Chicken", "Beef", "Vegetarian", "Pasta", "Seafood"];
      const randomCategory =
        categories[Math.floor(Math.random() * categories.length)];

      const response = await fetch(`${API_URL}filter.php?c=${randomCategory}`);
      const data = await response.json();

      if (data.meals) {
        // Ограничиваем количество одновременно загружаемых рецептов
        const mealsToLoad = data.meals.slice(0, 6);

        // Загружаем детали только для необходимых рецептов
        const detailedRecipes = await Promise.all(
          mealsToLoad.map((meal) =>
            fetch(`${API_URL}lookup.php?i=${meal.idMeal}`).then((res) =>
              res.json()
            )
          )
        );

        const recipes = detailedRecipes.map((item) => item.meals[0]);
        displayRecipes(recipes);
      }
    } catch (error) {
      console.error("Ошибка при загрузке популярных рецептов:", error);
      showMessage("Не удалось загрузить популярные рецепты", "error");
    } finally {
      hideLoading();
    }
  }

  // Загружаем популярные рецепты при загрузке страницы
  loadPopularRecipes();
});
