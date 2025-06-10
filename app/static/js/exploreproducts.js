// --- Product Recommendation Logic ---

// Dummy product database (replace with real data fetching)
const productDatabase = {
  // Cleansers
  cleanser: [
    { name: "CeraVe Hydrating Facial Cleanser", type: "cleanser", skinType: "Normal to Dry, Sensitive", benefit: "Hydrating, gentle" },
    { name: "La Roche-Posay Toleriane Purifying Foaming Cleanser", type: "cleanser", skinType: "Oily, Combination, Sensitive", benefit: "Purifying, removes excess oil" },
    { name: "Paula's Choice RESIST Perfectly Balanced Foaming Cleanser", type: "cleanser", skinType: "Oily, Combination", benefit: "Balances oil, removes makeup" },
    { name: "Youth To The People Superfood Cleanser", type: "cleanser", skinType: "All Skin Types", benefit: "Antioxidant-rich, gentle" },
  ],
  // Toners
  toner: [
    { name: "Thayers Witch Hazel Toner (Alcohol-Free)", type: "toner", skinType: "All Skin Types", benefit: "Soothes, balances pH" },
    { name: "Paula's Choice 2% BHA Liquid Exfoliant", type: "toner", skinType: "Oily, Acne-prone, Combination", benefit: "Exfoliates, clears pores" },
    { name: "Kiehl's Calendula Herbal-Extract Toner", type: "toner", skinType: "Normal, Oily, Sensitive", benefit: "Calming, soothes redness" },
    { name: "Laneige Cream Skin Toner & Moisturizer", type: "toner", skinType: "Dry, Normal", benefit: "Hydrating, nourishing" },
  ],
  // Serums & Treatments
  serum_treatment: [
    { name: "The Ordinary Niacinamide 10% + Zinc 1%", type: "serum_treatment", skinType: "Oily, Acne-prone, Combination", benefit: "Reduces blemishes, pore appearance" },
    { name: "Glow Recipe Watermelon Glow Niacinamide Dew Drops", type: "serum_treatment", skinType: "All Skin Types", benefit: "Brightening, hydrating" },
    { name: "Drunk Elephant C-Firma Fresh Day Serum", type: "serum_treatment", skinType: "All Skin Types", benefit: "Vitamin C, antioxidant, brightening" },
    { name: "SkinCeuticals CE Ferulic", type: "serum_treatment", skinType: "All Skin Types", benefit: "Potent antioxidant, anti-aging (high-end)" },
    { name: "Paula's Choice CLINICAL 1% Retinol Treatment", type: "serum_treatment", skinType: "All Skin Types (start slow)", benefit: "Anti-aging, fine lines, acne" },
    { name: "Cosrx Advanced Snail 96 Mucin Power Essence", type: "serum_treatment", skinType: "All Skin Types, particularly Dry, Dehydrated", benefit: "Repairing, hydrating" },
  ],
  // Moisturizers
  moisturizer: [
    { name: "Neutrogena Hydro Boost Water Gel", type: "moisturizer", skinType: "Oily, Combination", benefit: "Lightweight, hydrating" },
    { name: "CeraVe Moisturizing Cream", type: "moisturizer", skinType: "Dry, Normal, Sensitive", benefit: "Rich, barrier repair" },
    { name: "Vanicream Moisturizing Cream", type: "moisturizer", skinType: "Sensitive, All Skin Types", benefit: "Dermatologist recommended, free of common irritants" },
    { name: "First Aid Beauty Ultra Repair Cream Intense Hydration", type: "moisturizer", skinType: "Dry, Sensitive", benefit: "Rich, soothing" },
  ],
  // Sunscreens
  sunscreen: [
    { name: "EltaMD UV Clear Broad-Spectrum SPF 46", type: "sunscreen", skinType: "Acne-prone, Sensitive", benefit: "Lightweight, non-comedogenic" },
    { name: "Supergoop! Unseen Sunscreen SPF 40", type: "sunscreen", skinType: "All Skin Types", benefit: "Invisible, primer-like finish" },
    { name: "La Roche-Posay Anthelios Melt-in Milk Sunscreen SPF 60", type: "sunscreen", skinType: "All Skin Types, sensitive", benefit: "Broad-spectrum, hydrating" },
    { name: "ISNtree Hyaluronic Acid Watery Sun Gel SPF 50+ PA++++", type: "sunscreen", skinType: "All Skin Types, hydrating", benefit: "Lightweight, no white cast (K-beauty)" },
  ],
};

function getRecommendations(skinType, skinDiagnosis) {
  const recommendations = {
    cleanser: [],
    toner: [],
    serum_treatment: [],
    moisturizer: [],
    sunscreen: [],
  };

  const isSkinTypeMatch = (productSkinType, userSkinType) => {
    return productSkinType.split(', ').some(type => userSkinType.toLowerCase().includes(type.toLowerCase()));
  };

  // Cleansers
  if (skinType.includes("Oily") || skinType.includes("Combination") || skinDiagnosis.includes("Acne")) {
    recommendations.cleanser = productDatabase.cleanser.filter(p => isSkinTypeMatch(p.skinType, "Oily, Combination, Acne"));
  } else if (skinType.includes("Dry") || skinType.includes("Sensitive")) {
    recommendations.cleanser = productDatabase.cleanser.filter(p => isSkinTypeMatch(p.skinType, "Dry, Sensitive"));
  } else { // Normal/All Skin Types
    recommendations.cleanser = productDatabase.cleanser.filter(p => isSkinTypeMatch(p.skinType, "All Skin Types"));
  }
  if (recommendations.cleanser.length === 0) recommendations.cleanser = productDatabase.cleanser.slice(0, 2);


  // Toners - prioritize active ingredients for concerns
  if (skinDiagnosis.includes("Acne") || skinType.includes("Oily")) {
    recommendations.toner = productDatabase.toner.filter(p => p.name.includes("BHA") || p.name.includes("Witch Hazel"));
  } else if (skinType.includes("Dry") || skinDiagnosis.includes("Redness") || skinType.includes("Sensitive")) {
    recommendations.toner = productDatabase.toner.filter(p => p.name.includes("Calendula") || p.name.includes("Cream Skin") || p.name.includes("Witch Hazel"));
  } else {
    recommendations.toner = productDatabase.toner.slice(0, 2);
  }
  if (recommendations.toner.length === 0) recommendations.toner = productDatabase.toner.slice(0, 2);


  // Serums & Treatments
  if (skinDiagnosis.includes("Acne") || skinDiagnosis.includes("Redness")) {
    recommendations.serum_treatment = productDatabase.serum_treatment.filter(p => p.name.includes("Niacinamide") || p.name.includes("Retinol") || p.name.includes("Snail"));
  }
  if (skinType.includes("Dry") || skinDiagnosis.includes("Dehydrated")) {
    recommendations.serum_treatment.push(...productDatabase.serum_treatment.filter(p => p.name.includes("Snail")));
  }
  if (skinDiagnosis.includes("Fine lines") || skinDiagnosis.includes("Sun damage") || skinDiagnosis.includes("Hyperpigmentation")) {
    recommendations.serum_treatment.push(...productDatabase.serum_treatment.filter(p => p.name.includes("Vitamin C") || p.name.includes("Retinol")));
  }
  recommendations.serum_treatment = Array.from(new Set(recommendations.serum_treatment)).slice(0, 3);
  if (recommendations.serum_treatment.length === 0) recommendations.serum_treatment = productDatabase.serum_treatment.slice(0, 2);


  // Moisturizers
  if (skinType.includes("Oily") || skinType.includes("Combination") || skinDiagnosis.includes("Acne")) {
    recommendations.moisturizer = productDatabase.moisturizer.filter(p => p.name.includes("Hydro Boost") || p.name.includes("Vanicream"));
  } else if (skinType.includes("Dry") || skinType.includes("Sensitive")) {
    recommendations.moisturizer = productDatabase.moisturizer.filter(p => p.name.includes("CeraVe") || p.name.includes("First Aid Beauty") || p.name.includes("Vanicream"));
  } else {
    recommendations.moisturizer = productDatabase.moisturizer.slice(0, 2);
  }
  if (recommendations.moisturizer.length === 0) recommendations.moisturizer = productDatabase.moisturizer.slice(0, 2);


  // Sunscreens (generally universal, but can prioritize certain features)
  recommendations.sunscreen = productDatabase.sunscreen.filter(p => isSkinTypeMatch(p.skinType, skinType) || p.skinType.includes("All Skin Types"));
  if (skinDiagnosis.includes("Acne-prone")) {
    recommendations.sunscreen = recommendations.sunscreen.filter(p => p.name.includes("EltaMD UV Clear"));
  }
  if (recommendations.sunscreen.length === 0) recommendations.sunscreen = productDatabase.sunscreen.slice(0, 2);


  return recommendations;
}


// Function to display product recommendations directly on the page
document.addEventListener('DOMContentLoaded', () => {
  const recommendationsContainer = document.getElementById('productRecommendationsContainer');

  // --- SIMULATE SKIN ANALYSIS RESULTS ---
  // In a real app, you'd get this from your actual skin analysis or saved user data.
  // For now, these are fixed for demonstration.
  const simulatedSkinType = "Combination";
  const simulatedSkinDiagnosis = "Mild acne, Redness";
  // --- END SIMULATION ---

  const recommendedProducts = getRecommendations(simulatedSkinType, simulatedSkinDiagnosis);

  let productsHtml = `
    <h2 id="productRecHeader">Product Recommendations</h2>
    <p class="analysis-summary">Based on your simulated skin analysis (Skin Type: <strong>${simulatedSkinType}</strong>, Diagnosis: <strong>${simulatedSkinDiagnosis}</strong>), here are some product suggestions:</p>
    <div class="product-recommendation-list">
  `;

  for (const category in recommendedProducts) {
    if (recommendedProducts[category].length > 0) {
      productsHtml += `
        <h3>${category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' ')}s</h3>
        <ul>
      `;
      recommendedProducts[category].forEach(product => {
        productsHtml += `
          <li>
            <strong>${product.name}</strong>
            <p>${product.benefit || 'No specific benefit listed'}</p>
            <p style="font-size: 0.85em; color: #777;">Best for: ${product.skinType}</p>
          </li>
        `;
      });
      productsHtml += `</ul>`;
    }
  }

  productsHtml += `
      </div>
  `;

  recommendationsContainer.innerHTML = productsHtml;
});