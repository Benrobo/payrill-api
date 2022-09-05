-- phpMyAdmin SQL Dump
-- version 5.2.0
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Sep 03, 2022 at 08:09 PM
-- Server version: 10.5.12-MariaDB-1
-- PHP Version: 7.4.21

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `payrill`
--

-- --------------------------------------------------------

--
-- Table structure for table `checkout`
--

CREATE TABLE `checkout` (
  `id` int(10) NOT NULL,
  `ecart_id` varchar(6) NOT NULL,
  `item_id` varchar(6) NOT NULL,
  `item_name` varchar(100) NOT NULL,
  `item_price` int(10) NOT NULL,
  `item_quantity` int(10) NOT NULL,
  `item_currency` varchar(10) NOT NULL,
  `item_image` longtext NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `ecart`
--

CREATE TABLE `ecart` (
  `id` varchar(100) NOT NULL,
  `user_id` varchar(100) NOT NULL,
  `store_id` int(10) DEFAULT NULL,
  `paid` varchar(10) NOT NULL DEFAULT 'false',
  `createdAt` timestamp(6) NOT NULL DEFAULT current_timestamp(6),
  `confirmed` varchar(10) NOT NULL DEFAULT 'false'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `rating`
--

CREATE TABLE `rating` (
  `store_id` varchar(100) NOT NULL,
  `rate` int(6) NOT NULL,
  `user_id` varchar(100) NOT NULL,
  `review` longtext NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `stores`
--

CREATE TABLE `stores` (
  `id` int(6) NOT NULL,
  `user_id` varchar(6) NOT NULL,
  `name` varchar(100) NOT NULL,
  `subdomain` varchar(50) NOT NULL,
  `logo` longtext NOT NULL,
  `description` varchar(500) NOT NULL,
  `theme_bg` varchar(20) NOT NULL DEFAULT '#131418',
  `cover_photo` longtext NOT NULL,
  `theme_color` varchar(20) NOT NULL DEFAULT '#FFF',
  `location` varchar(100) NOT NULL,
  `verified` varchar(10) NOT NULL DEFAULT 'false'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `store_items`
--

CREATE TABLE `store_items` (
  `id` varchar(50) NOT NULL,
  `store_id` int(10) NOT NULL,
  `item_name` varchar(50) NOT NULL,
  `item_price` int(10) NOT NULL,
  `item_quantity` int(10) NOT NULL,
  `item_currency` varchar(20) NOT NULL,
  `item_description` longtext NOT NULL,
  `item_image` longtext NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `transaction`
--

CREATE TABLE `transaction` (
  `id` varchar(60) NOT NULL,
  `amount` int(10) NOT NULL,
  `title` varchar(100) NOT NULL,
  `type` varchar(50) NOT NULL,
  `currency` varchar(10) NOT NULL,
  `receiver_id` varchar(50) NOT NULL,
  `createdAt` timestamp(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  `sender_id` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` varchar(50) NOT NULL,
  `ewallet` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `type` varchar(20) NOT NULL DEFAULT 'user',
  `country` varchar(50) NOT NULL,
  `currency` varchar(50) NOT NULL,
  `pin` varchar(1000) NOT NULL DEFAULT '',
  `password` varchar(500) NOT NULL,
  `token` varchar(5000) NOT NULL,
  `issuing_id` varchar(300) NOT NULL,
  `card_id` varchar(100) NOT NULL,
  `contact_id` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `checkout`
--
ALTER TABLE `checkout`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `ecart`
--
ALTER TABLE `ecart`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `stores`
--
ALTER TABLE `stores`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `store_items`
--
ALTER TABLE `store_items`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `transaction`
--
ALTER TABLE `transaction`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `checkout`
--
ALTER TABLE `checkout`
  MODIFY `id` int(10) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `stores`
--
ALTER TABLE `stores`
  MODIFY `id` int(6) NOT NULL AUTO_INCREMENT;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
