{{ layout "_layout.vto" { theme, themes } }}
	<h1>Wichteltopf-Generator</h1>
	<p>Hier kann man sich kostenfrei einen Online-Wichteltopf einrichten.</p>
	<h2>Wie funktioniert es?</h2>
	<p>Beim Wichteln, auch bekannt als Julklapp, Secret Santa oder &bdquo;Engerl und Bengerl&rdquo;, beschenken sich Freund*innen und Kolleg*innen gegenseitig.</p>
	<p>Hier kann man sich einen Wichteltopf erstellen, um die Namen auszulosen, dabei bekommmt zwei Links:</p>
	<p>Einen Link verteilt man an alle Teilnehmer*innen, damit sie sich eintragen können. Jeder, der seinen Namen in den Topf wirft, bekommt einen Geheimnamen zugewiesen, den man sich merken muss, aber nicht den anderen sagen darf.</p>
	<p>Wenn alle ihren Namen eingetragen haben, kann man mit dem zweiten Link den Topf schließen. Jetzt werden alle Namen ausgezählt. Dabei wird jedem Geheimnamen eine Person zugewiesen, die er beschenken muss.</p>
	<h2>Wähle ein Design aus:</h2>
	<div style="display:relative;">
		{{ for theme of themes }}
		<img class="thumb" src="/assets/images/thumbnail/{{theme.filename}}" onclick="setTheme('{{theme.name}}')" />
		{{ /for }}
		<br clear="all">
	</div>
	<h2>Wichteltopf einrichten:</h2>
	<p>
		<form action="/{{id}}/feuer" method="POST">
			<input type="submit" value="Hier klicken">
			<input type="hidden" name="theme" id="inputTheme" value="{{theme}}">
		</form>
	</p>

	<script type="text/javascript">
		function setTheme(name) {
			document.getElementById('body').className = 'theme_'+name;
			document.getElementById('inputTheme').value = name;
		}
	</script>
{{ /layout }}