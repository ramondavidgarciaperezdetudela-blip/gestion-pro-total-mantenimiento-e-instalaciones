;;; Paredes para planos de instalaciones (Gestión Pro Total). Unidades: metros.
;;; PARED     dibuja paredes: pide material, grosor y alto, y se van marcando puntos
;;;           (se puede escribir la longitud en metros) mostrando la medida de cada tramo.
;;; PAREDEDIT cambia largo, grosor, alto y material de una pared ya dibujada.
;;; La pared es una polilínea con ancho = grosor, espesor = alto y capa = material.

(setq *gpt-materiales*
  '(("LADRILLO" 0.11 30) ("BLOQUE" 0.20 8) ("HORMIGON" 0.20 9) ("CEMENTO" 0.15 253)
    ("YESO" 0.07 254) ("PLADUR" 0.078 252) ("PANEL" 0.08 140) ("MADERA" 0.08 32) ("CRISTAL" 0.02 4) ("OTRO" 0.10 7)))

(defun gpt-mat-dato (m) (assoc (strcase m) *gpt-materiales*))

(defun gpt-capa-pared (m / d nombre)
  (setq d (gpt-mat-dato m) nombre (strcat "PARED-" (strcase m)))
  (if (not (tblsearch "LAYER" nombre))
    (entmake (list (cons 0 "LAYER") (cons 100 "AcDbSymbolTableRecord") (cons 100 "AcDbLayerTableRecord")
                   (cons 2 nombre) (cons 70 0) (cons 62 (caddr d)) (cons 6 "Continuous"))))
  nombre)

(defun gpt-medida (d) (strcat (rtos d 2 3) " m"))

(defun gpt-dibuja-pared (a b mat ancho alto)
  (entmake (list (cons 0 "LWPOLYLINE") (cons 100 "AcDbEntity") (cons 8 (gpt-capa-pared mat))
                 (cons 100 "AcDbPolyline") (cons 90 2) (cons 70 0) (cons 43 ancho) (cons 39 alto)
                 (list 10 (car a) (cadr a)) (list 10 (car b) (cadr b)))))

(defun c:PARED (/ mat p1 p2 d)
  (initget "LADRILLO BLOQUE HORMIGON CEMENTO YESO PLADUR PANEL MADERA CRISTAL OTRO")
  (setq mat (getkword (strcat "\nMaterial [LADRILLO/BLOQUE/HORMIGON/CEMENTO/YESO/PLADUR/PANEL/MADERA/CRISTAL/OTRO] <"
                              (if *gpt-mat* *gpt-mat* "LADRILLO") ">: ")))
  (if (not mat) (setq mat (if *gpt-mat* *gpt-mat* "LADRILLO")))
  (setq mat (strcase mat) *gpt-mat* mat)
  (setq d (getdist (strcat "\nGrosor en metros <" (rtos (if *gpt-ancho* *gpt-ancho* (cadr (gpt-mat-dato mat))) 2 3) ">: ")))
  (setq *gpt-ancho* (if d d (cadr (gpt-mat-dato mat))))
  (setq d (getdist (strcat "\nAlto en metros <" (rtos (if *gpt-alto* *gpt-alto* 2.5) 2 2) ">: ")))
  (setq *gpt-alto* (if d d (if *gpt-alto* *gpt-alto* 2.5)))
  (setq p1 (getpoint "\nPrimer punto de la pared: "))
  (while (and p1 (setq p2 (getpoint p1 "\nSiguiente punto o longitud en metros (Intro para terminar): ")))
    (gpt-dibuja-pared p1 p2 mat *gpt-ancho* *gpt-alto*)
    (princ (strcat "\nPared de " (gpt-medida (distance p1 p2)) " · " mat " · grosor " (rtos *gpt-ancho* 2 3) " m · alto " (rtos *gpt-alto* 2 2) " m"))
    (setq p1 p2))
  (princ))

(defun gpt-verts (ed / r) (foreach g ed (if (= (car g) 10) (setq r (append r (list (cdr g)))))) r)

(defun c:PAREDEDIT (/ sel ed e a b largo ang mat ancho alto op v n nuevo)
  (setq sel (entsel "\nElige una pared: "))
  (if (and sel (setq ed (entget (car sel))) (= (cdr (assoc 0 ed)) "LWPOLYLINE"))
    (progn
      (setq e (car sel) v (gpt-verts ed))
      (setq a (car v) b (cadr v) largo (distance a b))
      (setq ancho (cdr (assoc 43 ed)) alto (cdr (assoc 39 ed)) mat (cdr (assoc 8 ed)))
      (princ (strcat "\nPared: largo " (gpt-medida largo) " · grosor " (rtos (if ancho ancho 0.0) 2 3)
                     " m · alto " (rtos (if alto alto 0.0) 2 2) " m · " mat))
      (initget "Largo Grosor Alto Material")
      (setq op (getkword "\nCambiar [Largo/Grosor/Alto/Material] <salir>: "))
      (cond
        ((= op "Largo")
         (setq n (getdist "\nNuevo largo en metros: "))
         (if (and n (> n 0.0))
           (progn (setq ang (angle a b) nuevo (polar a ang n))
                  (setq ed (subst (cons 10 (list (car nuevo) (cadr nuevo))) (cons 10 (list (car b) (cadr b))) ed))
                  (entmod ed))))
        ((= op "Grosor")
         (setq n (getdist "\nNuevo grosor en metros: "))
         (if (and n (> n 0.0)) (entmod (subst (cons 43 n) (assoc 43 ed) ed))))
        ((= op "Alto")
         (setq n (getdist "\nNuevo alto en metros: "))
         (if (and n (> n 0.0))
           (entmod (if (assoc 39 ed) (subst (cons 39 n) (assoc 39 ed) ed) (append ed (list (cons 39 n)))))))
        ((= op "Material")
         (initget "LADRILLO BLOQUE HORMIGON CEMENTO YESO PLADUR PANEL MADERA CRISTAL OTRO")
         (setq n (getkword "\nMaterial [LADRILLO/BLOQUE/HORMIGON/CEMENTO/YESO/PLADUR/PANEL/MADERA/CRISTAL/OTRO]: "))
         (if n (entmod (subst (cons 8 (gpt-capa-pared n)) (assoc 8 ed) ed))))))
    (princ "\nNo es una pared de este programa."))
  (princ))
