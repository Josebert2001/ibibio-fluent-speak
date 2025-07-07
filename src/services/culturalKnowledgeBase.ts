
class CulturalKnowledgeBase {
  private knowledgeBase: Record<string, string> = {
    'ibibio culture': `Ibibio culture is rich and deeply rooted in southeastern Nigeria! 🌍

The Ibibio people are one of the largest ethnic groups in Nigeria, primarily found in Akwa Ibom State. Here are some key aspects of our beautiful culture:

**Traditional Values:**
• Strong family bonds and respect for elders
• Community cooperation and mutual support
• Spiritual connection with ancestors and nature
• Emphasis on hospitality and sharing

**Cultural Practices:**
• Traditional festivals like Ekpo masquerade
• Rich oral traditions and storytelling
• Traditional music with drums and folk songs
• Ceremonial rites of passage

**Social Structure:**
• Extended family system (Ufok)
• Village councils and traditional leadership
• Age-grade associations
• Gender-specific roles and responsibilities

Would you like to know more about any specific aspect of Ibibio culture?`,

    'ibibio food': `Ibibio cuisine is absolutely delicious and nutritious! 🍲

**Staple Foods:**
• **Afang soup** - made with wild vegetables and meat/fish
• **Edikang Ikong** - vegetable soup with pumpkin leaves
• **Pepper soup** - spicy broth with fish or meat
• **Pounded yam** (Fufu) - served with various soups
• **Plantain** - fried, boiled, or roasted
• **Cassava** - in various forms

**Cooking Methods:**
• Traditional clay pots for authentic flavors
• Palm oil as a primary cooking fat
• Abundant use of local spices and herbs
• Smoking and drying for food preservation

**Cultural Significance:**
• Meals are communal experiences
• Food sharing shows hospitality
• Special dishes for festivals and ceremonies
• Recipes passed down through generations

What Ibibio dish would you like to learn more about?`,

    'ibibio greetings': `Ibibio greetings are warm and show respect for others! 👋

**Basic Greetings:**
• **Nno** - Hello (used anytime)
• **Nno owo** - Hello person (more formal)
• **Ikwo fie** - Good morning
• **Ikwo emem** - Good afternoon
• **Ikwo uwesen** - Good evening

**Cultural Etiquette:**
• Always greet elders first
• Use both hands when greeting elders
• Ask about family and health
• Maintain eye contact as a sign of respect
• Include inquiries about work and well-being

**Extended Greetings:**
• "Afo ofon?" - How are you?
• "Ufok afo ofon?" - How is your family?
• "Uwem afo ofon?" - How is your life?

**Response Patterns:**
• "Nkpo" - I'm fine/good
• "Mmo ofon" - We are fine
• "Abasi akpa" - God is great (common response)

These greetings strengthen community bonds and show care for one another!`,

    'ibibio music': `Ibibio music is vibrant and deeply spiritual! 🎵

**Traditional Instruments:**
• **Drums** - Various types for different occasions
• **Ekomo** - Traditional xylophone
• **Uta** - Talking drum
• **Flutes** - Made from bamboo
• **Rattles** - For rhythmic accompaniment

**Musical Styles:**
• **Folk songs** - Storytelling through music
• **Work songs** - Sung during farming and labor
• **Ceremonial music** - For rituals and festivals
• **Children's songs** - For education and play
• **Praise songs** - Honoring ancestors and heroes

**Cultural Functions:**
• Communication across distances
• Preservation of history and stories
• Religious and spiritual practices
• Community celebration and bonding
• Educational tool for children

**Modern Influence:**
• Contemporary Ibibio artists blend traditional and modern styles
• Gospel music incorporates traditional rhythms
• Cultural festivals showcase traditional music
• Youth learning traditional instruments

Music is the heartbeat of Ibibio culture! 🥁`,

    'ibibio religion': `Ibibio traditional religion is deeply spiritual and nature-centered! 🙏

**Core Beliefs:**
• **Abasi** - The Supreme God, creator of all
• **Ancestors** - Spiritual guides and protectors
• **Nature spirits** - Present in trees, rivers, and land
• **Reincarnation** - Belief in the cycle of life
• **Karma** - Actions have spiritual consequences

**Religious Practices:**
• **Ancestor veneration** - Honoring those who passed
• **Libation ceremonies** - Offering drinks to spirits
• **Sacred groves** - Special places for worship
• **Ritual cleansing** - Purification ceremonies
• **Divination** - Seeking spiritual guidance

**Religious Festivals:**
• **Ekpo** - Ancestral masquerade festival
• **New Yam Festival** - Celebrating harvest
• **Cleansing ceremonies** - Community purification
• **Initiation rites** - Coming of age ceremonies

**Modern Context:**
• Many Ibibio people now practice Christianity
• Traditional beliefs often blend with Christianity
• Cultural festivals still maintain spiritual significance
• Elders preserve traditional knowledge

The spiritual connection to Abasi and ancestors remains strong in Ibibio hearts! ✨`
  };

  getCulturalInfo(query: string): string | null {
    const lowerQuery = query.toLowerCase();
    
    // Check for exact matches first
    for (const [key, value] of Object.entries(this.knowledgeBase)) {
      if (lowerQuery.includes(key)) {
        return value;
      }
    }
    
    // Check for related terms
    const culturalTerms: Record<string, string> = {
      'tradition': 'ibibio culture',
      'customs': 'ibibio culture',
      'festival': 'ibibio culture',
      'ceremony': 'ibibio culture',
      'cooking': 'ibibio food',
      'recipe': 'ibibio food',
      'dish': 'ibibio food',
      'soup': 'ibibio food',
      'hello': 'ibibio greetings',
      'greeting': 'ibibio greetings',
      'good morning': 'ibibio greetings',
      'song': 'ibibio music',
      'dance': 'ibibio music',
      'drum': 'ibibio music',
      'spiritual': 'ibibio religion',
      'god': 'ibibio religion',
      'belief': 'ibibio religion',
      'ancestor': 'ibibio religion'
    };
    
    for (const [term, category] of Object.entries(culturalTerms)) {
      if (lowerQuery.includes(term)) {
        return this.knowledgeBase[category] || null;
      }
    }
    
    return null;
  }

  getAllTopics(): string[] {
    return Object.keys(this.knowledgeBase);
  }

  addKnowledge(key: string, content: string): void {
    this.knowledgeBase[key.toLowerCase()] = content;
  }
}

export const culturalKnowledgeBase = new CulturalKnowledgeBase();
