;;; Paredes para planos de instalaciones (Gestión Pro Total). Unidades: metros.
;;;
;;; PARED      Dibuja paredes seguidas: primer punto, siguiente punto, siguiente punto… (Intro termina).
;;;            Antes de empezar puedes cambiar [Material/Grosor/Alto]; si no, usa los últimos (los valores
;;;            vienen en el propio texto). Con [Largo] escribes la longitud exacta en metros y marcas la
;;;            dirección. Cada tramo muestra su medida y queda rotulado en la capa PARED-MEDIDA.
;;; PAREDEDIT  Elige una pared (el tramo más cercano al clic) y cambia su largo, o el grosor, alto y
;;;            material de toda la cadena.
;;; PAREDMEDIDAS Rotula con su medida todas las paredes del dibujo.
;;;
;;; La pared es una polilínea con ancho = grosor, espesor = alto y capa = PARED-<MATERIAL>:
;;; es lo que entiende Gestión Pro Total al volver (paredes, material, medidas, vista 3D).

(setq *gpt-materiales*
  '(("LADRILLO" 0.11 30) ("BLOQUE" 0.20 8) ("HORMIGON" 0.20 9) ("CEMENTO" 0.15 253)
    ("YESO" 0.07 254) ("PLADUR" 0.078 252) ("PANEL" 0.08 140) ("MADERA" 0.08 32) ("CRISTAL" 0.02 4) ("OTRO" 0.10 7)))

(setq *gpt-mat* "LADRILLO" *gpt-ancho* 0.11 *gpt-alto* 2.5)

;; Crea la capa (si no existe) y le pone su color. entmake no aplica el color de la capa en CADCraft,
;; por eso se usa el comando -LAYER.
(defun gpt-nueva-capa (nombre color)
  (if (not (tblsearch "LAYER" nombre))
    (command "-LAYER" "N" nombre "C" (itoa color) nombre ""))
  nombre)

(defun gpt-mat-dato (m) (assoc (strcase m) *gpt-materiales*))
(defun gpt-medida (d) (strcat (rtos d 2 3) " m"))

(defun gpt-capa-pared (m)
  (gpt-nueva-capa (strcat "PARED-" (strcase m)) (caddr (gpt-mat-dato m))))

(defun gpt-capa-medida () (gpt-nueva-capa "PARED-MEDIDA" 2))

;; Texto con la medida, junto al tramo y girado como él (siempre legible).
(defun gpt-rotula (a b ancho / m ang pos)
  (gpt-capa-medida)
  (setq m (list (/ (+ (car a) (car b)) 2.0) (/ (+ (cadr a) (cadr b)) 2.0))
        ang (angle a b))
  (if (and (> ang (/ 3.14159265 2.0)) (<= ang (* 1.5 3.14159265))) (setq ang (+ ang 3.14159265)))
  (setq pos (polar m (+ ang (/ 3.14159265 2.0)) (+ 0.18 (/ ancho 2.0))))
  (entmake (list (cons 0 "TEXT") (cons 8 "PARED-MEDIDA") (list 10 (car pos) (cadr pos) 0.0) (list 11 (car pos) (cadr pos) 0.0)
                 (cons 40 0.16) (cons 1 (rtos (distance a b) 2 2)) (cons 50 ang) (cons 72 1) (cons 73 2))))

;; Polilínea de pared con todos los puntos de la cadena.
(defun gpt-pared-ent (pts mat ancho alto)
  (entmake (append (list (cons 0 "LWPOLYLINE") (cons 100 "AcDbEntity") (cons 8 (gpt-capa-pared mat))
                         (cons 100 "AcDbPolyline") (cons 90 (length pts)) (cons 70 0) (cons 43 ancho) (cons 39 alto))
                   (mapcar '(lambda (p) (list 10 (car p) (cadr p))) pts))))

(defun gpt-resumen ()
  (strcat *gpt-mat* " · grosor " (rtos *gpt-ancho* 2 3) " m · alto " (rtos *gpt-alto* 2 2) " m"))

(defun gpt-cambia-valor (kw / n)
  (cond
    ((= kw "Material")
     (initget "LADRILLO BLOQUE HORMIGON CEMENTO YESO PLADUR PANEL MADERA CRISTAL OTRO")
     (setq n (getkword "\nMaterial [LADRILLO/BLOQUE/HORMIGON/CEMENTO/YESO/PLADUR/PANEL/MADERA/CRISTAL/OTRO]: "))
     (if n (setq *gpt-mat* (strcase n) *gpt-ancho* (cadr (gpt-mat-dato n)))))
    ((= kw "Grosor")
     (setq n (getdist (strcat "\nGrosor en metros <" (rtos *gpt-ancho* 2 3) ">: ")))
     (if (and n (> n 0.0)) (setq *gpt-ancho* n)))
    ((= kw "Alto")
     (setq n (getdist (strcat "\nAlto en metros <" (rtos *gpt-alto* 2 2) ">: ")))
     (if (and n (> n 0.0)) (setq *gpt-alto* n)))))

(defun gpt-siguiente (p / q d dir)
  (initget "Largo")
  (setq q (getpoint p (strcat "\nSiguiente punto o [Largo] (Intro para terminar) · " (gpt-resumen) ": ")))
  (if (= q "Largo")
    (progn
      (setq d (getdist "\nLongitud de la pared en metros: "))
      (setq dir (if (and d (> d 0.0)) (getpoint p "\nDirección (marca un punto hacia donde va): ") nil))
      (setq q (if (and dir (listp dir) (> (distance p dir) 0.0)) (polar p (angle p dir) d) nil))))
  q)

(defun c:PARED (/ p q pts ent ult)
  ;; Primer punto (con opción de cambiar material, grosor y alto antes de empezar)
  (setq p "x")
  (while (not (listp p))
    (initget "Material Grosor Alto")
    (setq p (getpoint (strcat "\nPARED " (gpt-resumen) " — primer punto o [Material/Grosor/Alto]: ")))
    (if (not (listp p)) (gpt-cambia-valor p)))
  (if p
    (progn
      (setq pts (list p))
      (while (and p (setq q (gpt-siguiente p)))
        (setq pts (append pts (list q)))
        (if ent (entdel ent))
        (gpt-pared-ent pts *gpt-mat* *gpt-ancho* *gpt-alto*)
        (setq ent (entlast))
        (princ (strcat "\nTramo de " (gpt-medida (distance p q)) " · " (itoa (1- (length pts))) " tramo(s) en esta pared"))
        (setq p q))
      ;; Al terminar, rotula cada tramo con su medida
      (if (> (length pts) 1)
        (progn
          (setq ult pts)
          (while (cdr ult) (gpt-rotula (car ult) (cadr ult) *gpt-ancho*) (setq ult (cdr ult)))
          (princ (strcat "\nPared terminada: " (itoa (1- (length pts))) " tramo(s) · " (gpt-resumen)))))))
  (princ))

(defun gpt-verts (ed / r) (foreach g ed (if (= (car g) 10) (setq r (append r (list (cdr g)))))) r)

;; Distancia de un punto a un tramo
(defun gpt-dist-tramo (p a b / l t0 proy)
  (setq l (distance a b))
  (if (< l 1e-9) (distance p a)
    (progn
      (setq t0 (/ (+ (* (- (car p) (car a)) (- (car b) (car a))) (* (- (cadr p) (cadr a)) (- (cadr b) (cadr a)))) (* l l)))
      (if (< t0 0.0) (setq t0 0.0)) (if (> t0 1.0) (setq t0 1.0))
      (setq proy (list (+ (car a) (* t0 (- (car b) (car a)))) (+ (cadr a) (* t0 (- (cadr b) (cadr a))))))
      (distance p proy))))

(defun c:PAREDEDIT (/ sel ed v n k i best dmin pick a b largo ang ancho alto mat op d nb delta nuevo)
  (setq sel (entsel "\nElige una pared (clic sobre el tramo): "))
  (if (and sel (setq ed (entget (car sel))) (= (cdr (assoc 0 ed)) "LWPOLYLINE") (wcmatch (cdr (assoc 8 ed)) "PARED-*"))
    (progn
      (setq pick (cadr sel) v (gpt-verts ed) n (length v) k 0 i 0 dmin 1e30)
      (while (< i (1- n))
        (setq d (gpt-dist-tramo pick (nth i v) (nth (1+ i) v)))
        (if (< d dmin) (setq dmin d k i))
        (setq i (1+ i)))
      (setq a (nth k v) b (nth (1+ k) v) largo (distance a b))
      (setq ancho (cdr (assoc 43 ed)) alto (cdr (assoc 39 ed)) mat (cdr (assoc 8 ed)))
      (princ (strcat "\nTramo elegido: largo " (gpt-medida largo) " · grosor " (rtos (if ancho ancho 0.0) 2 3)
                     " m · alto " (rtos (if alto alto 0.0) 2 2) " m · " mat))
      (initget "Largo Grosor Alto Material")
      (setq op (getkword "\nCambiar [Largo/Grosor/Alto/Material] <salir>: "))
      (cond
        ((= op "Largo")
         (setq d (getdist (strcat "\nNuevo largo en metros <" (rtos largo 2 3) ">: ")))
         (if (and d (> d 0.0))
           (progn
             (setq ang (angle a b) nb (polar a ang d) delta (list (- (car nb) (car b)) (- (cadr nb) (cadr b))))
             ;; el tramo cambia y los siguientes se desplazan con él, para no romper la pared
             (setq i 0 nuevo nil)
             (foreach p v
               (setq nuevo (append nuevo (list (if (> i k) (list (+ (car p) (car delta)) (+ (cadr p) (cadr delta))) (list (car p) (cadr p))))))
               (setq i (1+ i)))
             (setq nuevo (mapcar '(lambda (p) (list 10 (car p) (cadr p))) nuevo))
             (setq i 0)
             (entmod (append (vl-remove-if '(lambda (g) (= (car g) 10)) ed) nuevo))
             (c:PAREDMEDIDAS)
             (princ (strcat "\nLargo cambiado a " (gpt-medida d) "."))))
         )
        ((= op "Grosor")
         (setq d (getdist "\nNuevo grosor en metros: "))
         (if (and d (> d 0.0)) (entmod (subst (cons 43 d) (assoc 43 ed) ed))))
        ((= op "Alto")
         (setq d (getdist "\nNuevo alto en metros: "))
         (if (and d (> d 0.0))
           (entmod (if (assoc 39 ed) (subst (cons 39 d) (assoc 39 ed) ed) (append ed (list (cons 39 d)))))))
        ((= op "Material")
         (initget "LADRILLO BLOQUE HORMIGON CEMENTO YESO PLADUR PANEL MADERA CRISTAL OTRO")
         (setq d (getkword "\nMaterial [LADRILLO/BLOQUE/HORMIGON/CEMENTO/YESO/PLADUR/PANEL/MADERA/CRISTAL/OTRO]: "))
         (if d (entmod (subst (cons 8 (gpt-capa-pared d)) (assoc 8 ed) ed))))))
    (princ "\nNo es una pared de este programa."))
  (princ))

;; Quita los rótulos de medida y vuelve a escribirlos para todas las paredes del dibujo.
(defun c:PAREDMEDIDAS (/ ss i ed v j)
  (if (setq ss (ssget "X" '((8 . "PARED-MEDIDA")))) (progn (setq i 0) (repeat (sslength ss) (entdel (ssname ss i)) (setq i (1+ i)))))
  (if (setq ss (ssget "X" '((0 . "LWPOLYLINE") (8 . "PARED-*"))))
    (progn
      (setq i 0)
      (repeat (sslength ss)
        (setq ed (entget (ssname ss i)) v (gpt-verts ed) j 0)
        (while (< j (1- (length v)))
          (gpt-rotula (nth j v) (nth (1+ j) v) (if (cdr (assoc 43 ed)) (cdr (assoc 43 ed)) 0.1))
          (setq j (1+ j)))
        (setq i (1+ i)))))
  (princ "\nMedidas de pared rotuladas.")
  (princ))
