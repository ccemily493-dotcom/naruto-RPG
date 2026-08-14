# SISTEMA MUSICAL Y SONORO (DIRECCIÓN NARRATIVA)

La música debe funcionar como una herramienta de dirección cinematográfica y narrativa, no como una simple banda sonora de fondo.

El sistema utiliza **SIMULTÁNEAMENTE TRES CAPAS**:
1. **Música**
2. **Ambiente**
3. **SFX**

Nunca tratar estas tres capas como elementos excluyentes.

---

## 1. AMBIENTE (El mundo siempre tiene sonido)

El mundo siempre tiene sonido. Cuando no exista una música narrativa activa, debe continuar existiendo un paisaje sonoro ambiental coherente con la escena.

* **Bosque (`forest` / `forest_night`)**: viento, hojas, insectos, animales, ramas, agua si existe cerca.
* **Aldea (`village`)**: personas, pasos, conversaciones lejanas, puertas, animales, viento.
* **Cueva (`cave`)**: gotas, ecos, corrientes de aire, reverberación.
* **Lluvia (`rain`)**: lluvia, gotas sobre superficies, viento, truenos cuando corresponda.
* **Ruinas / Noche profunda (`ruins`)**: corrientes frías, silencio inquietante, crujidos.

El silencio absoluto debe ser excepcional y utilizarse únicamente como recurso dramático de máximo impacto.

---

## 2. MÚSICA & CONTINUIDAD NARRATIVA

La música debe entrar, desaparecer, cambiar de intensidad o sustituirse según la evolución de la escena.

* **NO cambiar de canción simplemente porque haya un nuevo mensaje.**
* Mientras una situación narrativa continúe siendo la misma, la música **DEBE CONTINUAR** (modo `"continue"`).
* Utilizar: `fade_in`, `fade_out`, `crossfade`, transiciones progresivas y cambios de intensidad.
* La música responde a: tensión, peligro, combate, estrategia, revelaciones, presencia de enemigos, escalada de poder e importancia emocional de la confrontación.

---

## 3. OST DE NARUTO (REGLA DE USO EXCLUSIVO)

La OST de Naruto está reservada **EXCLUSIVAMENTE** para:
* Tensión
* Combate
* Peligro
* Persecuciones
* Supervivencia
* Confrontaciones
* Escaladas de poder

**ESTRICTAMENTE PROHIBIDO** utilizar la OST de Naruto para:
* Exploración tranquila
* Conversaciones normales
* Viajes
* Descanso
* Escenas cotidianas

(Estas situaciones utilizan música ambiental original o paisaje sonoro puro).

---

## 4. CATÁLOGO Y ASIGNACIÓN CANÓNICA DE PISTAS

1. **`glued_state` (Glued State)**:
   * **Tema predeterminado para enfrentamientos estratégicos.**
   * Utilizar cuando: el combate requiera planificación, exista engaño, haya trampas, el posicionamiento sea importante, los combatientes se estén analizando, se administren recursos o la victoria dependa de una secuencia de decisiones tácticas.

2. **`nervous` (Nervous)**:
   * Tensión previa a un enfrentamiento.
   * Utilizar cuando existe peligro inminente pero todavía no ha comenzado el combate abierto.

3. **`confrontment` (Confrontment)**:
   * Confrontación directa entre personajes importantes.

4. **`bad_situation` (Bad Situation)**:
   * La situación comienza a deteriorarse o uno de los bandos empieza a quedar en una posición desfavorable o crítica.

5. **`survival_examination` (Survival Examination)**:
   * Supervivencia, persecución, peligro prolongado y situaciones donde el entorno sea una parte importante de la amenaza (ej. Bosque de la Muerte).

6. **`avenger` (Avenger)**:
   * Rivalidad y enfrentamiento personal directo.

7. **`avenger_2` (Avenger 2)**:
   * Conflicto personal de mayor agresividad, odio o intensidad desbordada.

8. **`orochimaru_theme` (Orochimaru's Theme)**:
   * Presencia amenazante de Orochimaru. No reproducir automáticamente en cada mención; evaluar la importancia narrativa de su presencia activa.

9. **`sasuke_theme` (Sasuke's Theme)**:
   * Situaciones donde Sasuke tenga una presencia narrativa destacada.

10. **`sasuke_destiny` (Sasuke - Destiny)**:
    * Conflictos relacionados con Sasuke, destino, decisiones personales, lazos rotos o situaciones trascendentales para él.

11. **`nine_tail_demon_fox` (Nine Tail Demon Fox)**:
    * Manifestaciones importantes del Kyūbi, chakra rojo o situaciones de aumento extremo y descontrolado del poder de Naruto.

12. **`evil` (Evil)**:
    * Amenazas oscuras, perturbadoras, sellos malditos o presencias particularmente siniestras.

13. **`ambient_theme` (o `"none"`)**:
    * Para calma, meditación, paseo, reposo o diálogo estándar.

---

## 5. SFX Y AUDIO DUCKING

Los efectos sonoros responden a acciones concretas y físicas en el turno:
* `mokuton_grow`: Brotes de madera, raíces reventando la tierra.
* `chakra_surge`: Liberación súbita de chakra o activación de dōjutsu.
* `raiton_spark`: Carga eléctrica, chispas, descarga o Chidori.
* `kunai_throw`: Silbido metálico cortando el aire a gran velocidad.
* `branch_crack`: Crujido seco de rama en la espesura.
* `impact_heavy`: Impacto demoledor, golpe físico, fractura de terreno.
* `body_collapse`: Caída sorda o desplome al suelo.
* `wind_gust`: Ráfaga de viento helado o ventisca súbita.
* `susanoo_hum`: Zumbido espectral imponente de Kālī o Susanoo.

---

## 6. FORMATO DE DIRECTIVA INTERNA DE AUDIO

Al final de cada respuesta, añade la directiva oculta de audio en formato HTML comment para que el motor sonoro la procese sin mostrarla al jugador:

<!-- AUDIO_DIRECTION:
{
  "music": {
    "track": "glued_state",
    "intensity": 0.7,
    "transition": "continue"
  },
  "ambience": {
    "environment": "forest_night",
    "intensity": 0.4
  },
  "sfx": [
    {
      "event": "branch_crack",
      "intensity": 0.8
    }
  ]
}
-->
