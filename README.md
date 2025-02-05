# Readme Stats For Your Coding Journey 🚀

Showcase your open-source contributions with stunning stats directly on your GitHub profile! This template automatically generates charts and metrics to display:

- 🏆 **GitHub Achievements** (stars, forks, contributions)
- ⏰ **Time Spent Coding** (all-time and last 7 days)
- 💻 **Programming Languages** you use
- 🌟 **Projects** you work on

## 🎯 What you'll Get

<!-- README STATS -->

<!-- Github Stats -->
<table cellspacing="0" cellpadding="0" style="border-collapse: separate; border-spacing: 8px; width: 100%; background: transparent;">
  <tr style="background: transparent;">
    <td width="25%" align="center" style="background: transparent; border: 1px solid #7c848c; border-radius: 5px;">
      <img src="/../../raw/data/data/contributions-card.svg" alt="Contributions" width="100%">
    </td>
    <td width="25%" align="center" style="background: transparent; border: 1px solid #7c848c; border-radius: 5px;">
      <img src="/../../raw/data/data/prs-card.svg" alt="Pull Requests" width="100%">
    </td>
    <td width="25%" align="center" style="background: transparent; border: 1px solid #7c848c; border-radius: 5px;">
      <img src="/../../raw/data/data/stars-card.svg" alt="Stars" width="100%">
    </td>
    <td width="25%" align="center" style="background: transparent; border: 1px solid #7c848c; border-radius: 5px;">
      <img src="/../../raw/data/data/forks-card.svg" alt="Forks" width="100%">
    </td>
  </tr>
</table>
<!-- Github Stats -->

<!-- Repository views over time for top 5 repositories -->
<table cellspacing="0" cellpadding="0" style="border-collapse: separate; border-spacing: 8px; width: 100%; background: transparent; margin-top: 20px;">
  <tr style="background: transparent;">
    <td width="100%" align="center" style="background: transparent; border: 1px solid #7c848c; border-radius: 5px;">
      <img src="/../../raw/data/data/traffic-chart.svg" alt="Traffic Chart" width="100%">
    </td>
  </tr>
</table>
<!-- Repository views over time for top 5 repositories -->

<!-- Wakapi Stats -->
<table cellspacing="0" cellpadding="0" style="border-collapse: separate; border-spacing: 8px; width: 100%; background: transparent; margin-top: 20px;">
  <tr style="background: transparent;">
    <td width="50%" align="center" style="background: transparent; border: 1px solid #7c848c; border-radius: 5px;">
      <img src="/../../raw/data/data/all_time-coding-stats.svg" alt="Daily Average Hours" width="100%">
    </td>
    <td width="50%" align="center" style="background: transparent; border: 1px solid #7c848c; border-radius: 5px;">
      <img src="/../../raw/data/data/last_7_days-coding-stats.svg" alt="Total Hours" width="100%">
    </td>
  </tr>

  <tr style="background: transparent;">
    <td width="50%" align="center" style="background: transparent; border: 1px solid #7c848c; border-radius: 5px;">
      <h3 style="color: #7c848c;">Projects</h3>
      <img src="/../../raw/data/data/projects-radar.svg" alt="Time Spent by Project" width="100%">
    </td>
    <td width="50%" align="center" style="background: transparent; border: 1px solid #7c848c; border-radius: 5px;">
      <h3 style="color: #7c848c;">Languages</h3>
      <img src="/../../raw/data/data/languages-radar.svg" alt="Time Spent by Language" width="100%">
    </td>
  </tr>

  <tr style="background: transparent; margin-top: 20px;">
    <td width="50%" align="center" style="background: transparent; border: 1px solid #7c848c; border-radius: 5px;">
      <img src="/../../raw/data/data/projects-bar.svg" alt="Time Spent by Project (Bar)" width="100%">
    </td>
    <td width="50%" align="center" style="background: transparent; border: 1px solid #7c848c; border-radius: 5px;">
      <img src="/../../raw/data/data/languages-bar.svg" alt="Time Spent by Language (Bar)" width="100%">
    </td>
  </tr>
</table>
<!-- Wakapi Stats -->

<!-- README STATS -->

Want to see it in action? Check out a [**live demo on my GitHub account**](https://github.com/senthurayyappan/senthurayyappan)!

## 🛠️ Quick Setup Guide

### Step 1: 🚀 Create Your Stats Repository

1. Click the green "**Use this template**" button at the top of this page.
2. Name your new repository **exactly** the same as your GitHub username.
   - *Example:* If your username is `johndoe`, name the repository `johndoe`.

> **🚨 Don't Panic!**  
If you notice that the actions fail or the stats aren't rendering right as soon as you create the repository, don't worry! It is just due to the missing secrets. Please continue following the steps below.

### Step 2: 🎯 Choose Your Stats Level

---

#### Option A: ⭐ Basic GitHub Stats (Simple Setup)

If you want to display your GitHub activity (stars, contributions, PRs, etc.), follow these steps:

1. Navigate to your repository's **Settings** ⚙️
2. Click on **Secrets and variables** → **Actions** 🔐
3. Add the following secret:
   - **Name:** `GH_TOKEN`
   - **Value:** Generate one at [GitHub Settings → Developer Settings → Personal Access Tokens (classic)](https://github.com/settings/tokens).
   - **Note:** Please grant the following scopes to the personal access token:
     - `repo`
     - `user`
     - `read:org` (under `admin:org` if you wish to fetch organization repositories)

---

#### Option B: 📊 Detailed Coding Stats (Full Setup)

For comprehensive stats including coding time and language usage:

1. **Set Up WakaTime:** ⏱️
   - Sign up at [Wakapi](https://wakapi.dev) to collect your coding stats.
   - Setting up a Wakapi account is free and will involve installing a Wakatime extension for your code editor.

2. **Add Repository Secrets:** 🔑
   - `GH_TOKEN`: Generate from [GitHub Settings → Developer Settings → Personal Access Tokens](https://github.com/settings/tokens).
   - `WAKAPI_USERNAME`: Your Wakapi username.
   - `WAKAPI_TOKEN`: Retrieve this from your Wakapi settings.

---

### Step 3: 🎉 Finalize Your Setup

- ▶️ To update your README stats immediately, after adding all the secrets, navigate to the **Actions** tab, click on **Update Readme Stats** workflow on the left sidebar, and click **Run workflow**. This will update your README stats.
- 📝 Remove all of the existing README instructions except for the content between the `<!-- README STATS -->` comments. This block of html code has placeholders for the stats. 
- 🗑️ Remove wakapi related html tags from the `README.md` file if you are not using the full setup.
- ⏰ Your stats will automatically update every day at *5:00 PM* UTC.
- ✨ Feel free to customize the `README.md` further to better fit your personal style!

---

## 💡 What's the Difference?

- **Basic Setup:**
  - Displays analytics of your top 5 github repositories, contributions, stars, and forks.
  
- **Full Setup:**
  - Includes everything in the Basic Setup **plus**:
    - Exact coding time per day.
    - Most used programming languages.
    - Projects you spend time on.
    - Detailed coding patterns.

## Contributing

If you have any suggestions or improvements, feel free to create a pull request. All contributions are welcome!
